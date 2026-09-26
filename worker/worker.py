# worker/worker.py
import json
import time
import boto3
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

    s3.put_object(
        Bucket=THUMB_BUCKET,
        Key=thumb_key,
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
    print("Worker running. Listening for messages on auradrive-queue...")
    while True:
        try:
            res = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=10,
                VisibilityTimeout=30,
            )
            messages = res.get("Messages", [])
            for msg in messages:
                handle_message(msg)
        except Exception as e:
            print(f"[Worker Error] SQS poll exception: {e}")
            time.sleep(2)


if __name__ == "__main__":
    poll_queue()