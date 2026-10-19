# worker/worker.py
import json
import logging
import time
from datetime import datetime, timezone
import boto3
from botocore.config import Config

from worker.config import (
    AWS_ACCESS_KEY_ID,
    AWS_ENDPOINT_URL,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
    QUEUE_URL,
    RAW_BUCKET,
    TABLE_NAME,
    THUMB_BUCKET,
)
from worker.image_processor import create_thumbnail
from worker.metadata import extract_metadata

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AuraDriveWorker")

# Path-style addressing required for LocalStack S3 emulator
s3_config = Config(s3={"addressing_style": "path"})

s3 = boto3.client(
    "s3",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    config=s3_config,
)

sqs = boto3.client(
    "sqs",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

table = dynamodb.Table(TABLE_NAME)


def handle_message(msg: dict) -> None:
    receipt_handle = msg["ReceiptHandle"]
    body = json.loads(msg["Body"])

    media_id = body.get("media_id")
    user_id = body.get("user_id")
    raw_s3_key = body.get("raw_s3_key")

    if not media_id or not user_id or not raw_s3_key:
        logger.warning("Dropping malformed message: %s", body)
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt_handle)
        return

    logger.info("Processing media_id=%s for user_id=%s", media_id, user_id)

    try:
        # 1. Download original raw asset from S3
        raw_obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_s3_key)
        raw_bytes = raw_obj["Body"].read()

        # 2. Extract technical metadata & EXIF
        meta = extract_metadata(raw_bytes)

        # 3. Create WebP thumbnail
        thumb_bytes = create_thumbnail(raw_bytes)
        thumb_key = f"users/{user_id}/thumbnails/{media_id}.webp"

        # 4. Upload thumbnail to isolated path
        s3.put_object(
            Bucket=THUMB_BUCKET,
            Key=thumb_key,
            Body=thumb_bytes,
            ContentType="image/webp",
        )

        now = datetime.now(timezone.utc).isoformat()

        # 5. Atomically update DynamoDB single-table schema
        update_expr = (
            "SET #st = :done, "
            "thumbnail_s3_key = :tk, "
            "updated_at = :t, "
            "width = :w, "
            "height = :h, "
            "file_size_bytes = :fs, "
            "media_format = :fmt, "
            "aspect_ratio = :ar, "
            "exif = :ex, "
            "GSI1PK = :gpk, "
            "GSI1SK = :gsk"
        )

        expr_attr_values = {
            ":done": "done",
            ":tk": thumb_key,
            ":t": now,
            ":w": meta.get("width"),
            ":h": meta.get("height"),
            ":fs": meta.get("file_size_bytes"),
            ":fmt": meta.get("format"),
            ":ar": meta.get("aspect_ratio"),
            ":ex": meta.get("exif", {}),
            ":gpk": f"USER#{user_id}#STATUS#done",
            ":gsk": now,
        }

        table.update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
            UpdateExpression=update_expr,
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues=expr_attr_values,
        )

        # 6. Acknowledge and delete message from queue
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=receipt_handle)
        logger.info("Successfully finished media_id=%s", media_id)

    except Exception as exc:
        logger.exception("Failed processing media_id=%s: %s", media_id, exc)
        try:
            # Mark status failed in DynamoDB so UI reflects failure state
            table.update_item(
                Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
                UpdateExpression="SET #st = :failed, updated_at = :t",
                ExpressionAttributeNames={"#st": "status"},
                ExpressionAttributeValues={
                    ":failed": "failed",
                    ":t": datetime.now(timezone.utc).isoformat(),
                },
            )
        except Exception as db_err:
            logger.error("Could not update status to failed in DB: %s", db_err)

        # Leave message in SQS to trigger visibility timeout and DLQ redrive


def poll_loop() -> None:
    logger.info("Worker daemon started. Polling SQS: %s", QUEUE_URL)
    while True:
        try:
            resp = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20,
                VisibilityTimeout=60,
            )
            messages = resp.get("Messages", [])
            for msg in messages:
                handle_message(msg)
        except Exception as err:
            logger.error("SQS polling error: %s", err)
            time.sleep(3)


if __name__ == "__main__":
    poll_loop()