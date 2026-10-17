import os
import io
import json
import time
import boto3
from datetime import datetime, timezone
from botocore.config import Config
from PIL import Image, ImageOps

ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = os.getenv("AWS_REGION", "us-east-1")
RAW_BUCKET = os.getenv("RAW_BUCKET", "auradrive-raw")
THUMB_BUCKET = os.getenv("THUMB_BUCKET", "auradrive-thumbnails")
TABLE_NAME = os.getenv("TABLE_NAME", "AuraDrive_Storage")
QUEUE_URL = os.getenv("QUEUE_URL", "http://localhost:4566/000000000000/auradrive-queue")

boto_config = Config(s3={"addressing_style": "path"}) if ENDPOINT_URL else Config()

s3 = boto3.client(
    "s3",
    endpoint_url=ENDPOINT_URL,
    region_name=REGION,
    config=boto_config,
    aws_access_key_id="test",
    aws_secret_access_key="test"
from botocore.config import Config

from worker.config import (
    AWS_ENDPOINT_URL,
    AWS_REGION,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    QUEUE_URL,
    RAW_BUCKET,
    THUMB_BUCKET,
    TABLE_NAME,
)
from worker.image_processor import create_thumbnail
from worker.metadata import extract_metadata

# Ensure path-style addressing for S3 inside Docker/LocalStack
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
    endpoint_url=ENDPOINT_URL,
    region_name=REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test"
)
sqs = boto3.client(
    "sqs",
    endpoint_url=ENDPOINT_URL,
    region_name=REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test"
)
table = dynamodb.Table(TABLE_NAME)


def process_image(file_bytes: bytes) -> bytes:
    """EXIF transpose, alpha preservation, and WebP Lanczos 300x300 downsampling."""
    with Image.open(io.BytesIO(file_bytes)) as img:
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img.thumbnail((300, 300), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        img.save(out_buf, format="WEBP", quality=85, method=6)
        return out_buf.getvalue()
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)

table = dynamodb.Table(TABLE_NAME)


def process_image(media_id: str, raw_key: str):
    """Download raw image once, produce thumbnail, extract metadata, and upload."""
    raw_obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_key)
    raw_bytes = raw_obj["Body"].read()

    # 1. Generate & upload WebP thumbnail
    thumb_bytes = create_thumbnail(raw_bytes)
    thumb_key = f"thumbnails/{media_id}_thumb.webp"


def handle_message(msg):
    """Processes user-isolated media and performs atomic commit to DynamoDB."""
    body = json.loads(msg["Body"])
    media_id = body["media_id"]
    user_id = body["user_id"]
    raw_s3_key = body["raw_s3_key"]
    print(f"[*] Processing item {media_id} for user {user_id}")

    # 1. Download raw image
    obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_s3_key)
    raw_data = obj["Body"].read()

    # 2. Transform to WebP thumbnail
    webp_data = process_image(raw_data)
    thumb_key = f"users/{user_id}/thumbnails/{media_id}.webp"

    # 3. Store processed thumbnail in user-isolated space
    s3.put_object(
        Bucket=THUMB_BUCKET,
        Key=thumb_key,
        Body=webp_data,
        ContentType="image/webp"
    )

    now = datetime.now(timezone.utc).isoformat()

    # 4. Atomically update DynamoDB single-table schema with GSI1
    table.update_item(
        Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
        UpdateExpression="SET #st = :done, thumbnail_s3_key = :k, updated_at = :t, GSI1PK = :gpk, GSI1SK = :gsk",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={
            ":done": "done",
            ":k": thumb_key,
            ":t": now,
            ":gpk": f"USER#{user_id}#STATUS#done",
            ":gsk": now
        }
    )

    # 5. Safe SQS message clearance
    sqs.delete_message(
        QueueUrl=QUEUE_URL,
        ReceiptHandle=msg["ReceiptHandle"]
    )
    print(f"[+] Successfully finished {media_id}")


def poll_loop():
        Body=thumb_bytes,
        ContentType="image/webp",
    )

    # 2. Extract metadata
    meta = extract_metadata(raw_bytes)

    return thumb_key, meta


def handle_message(msg):
    media_id = None
    try:
        body = json.loads(msg["Body"])
        media_id = body.get("media_id")
        raw_key = body.get("raw_s3_key")

        if not media_id or not raw_key:
            print(f"[Worker Skip] Malformed message body: {msg['Body']}")
            sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg["ReceiptHandle"])
            return

        # Process image and extract metadata in one pass
        thumb_key, meta = process_image(media_id, raw_key)

        # Single atomic update to DynamoDB
        table.update_item(
            Key={"media_id": media_id},
            UpdateExpression="SET #st = :done, thumbnail_s3_key = :tk, metadata_info = :m",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":done": "done",
                ":tk": thumb_key,
                ":m": meta,
            },
        )

        # Acknowledge and remove from queue
        sqs.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=msg["ReceiptHandle"])
        print(f"[Worker] Completed media_id: {media_id}")

    except Exception as e:
        print(f"[Worker Error] Processing failure: {e}")
        if media_id:
            try:
                table.update_item(
                    Key={"media_id": media_id},
                    UpdateExpression="SET #st = :failed",
                    ExpressionAttributeNames={"#st": "status"},
                    ExpressionAttributeValues={":failed": "failed"},
                )
            except Exception as db_err:
                print(f"[Worker Error] Could not set failed status in DB: {db_err}")
        # Message is left in queue for retry / DLQ redrive


def poll_queue():
    """Continuous SQS long-polling daemon loop."""
    print("[*] Worker active. Long-polling SQS on auradrive-queue...")
    while True:
        try:
            resp = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20,
                VisibilityTimeout=60
                MaxNumberOfMessages=1,
                WaitTimeSeconds=10,
                VisibilityTimeout=30,
            )
            messages = resp.get("Messages", [])
            for msg in messages:
                try:
                    handle_message(msg)
                except Exception as ex:
                    print(f"[!] Processing failed for message {msg.get('MessageId')}: {str(ex)}")
        except Exception as conn_err:
            print(f"[!] Error polling SQS: {str(conn_err)}")
            time.sleep(5)
                handle_message(msg)
        except Exception as e:
            print(f"[Worker Error] SQS poll exception: {e}")
            time.sleep(2)


if __name__ == "__main__":
    poll_loop()