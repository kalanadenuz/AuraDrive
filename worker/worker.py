# worker/worker.py
import json
import time
import boto3

from worker.metadata import extract_metadata

from worker.config import AWS_ENDPOINT_URL, QUEUE_URL, RAW_BUCKET, THUMB_BUCKET
from worker.image_processor import create_thumbnail

# Initialize AWS clients targeting LocalStack with dummy credentials
s3 = boto3.client(
    "s3",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1"
)
sqs = boto3.client(
    "sqs",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1"
)
dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url=AWS_ENDPOINT_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1"
)
table = dynamodb.Table("AuraDrive_Media")


def process_s3_image(media_id: str, raw_key: str) -> str:
    """Download raw image, convert to WebP thumbnail, and upload to S3."""
    raw_obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_key)
    raw_bytes = raw_obj["Body"].read()
    thumb_bytes = create_thumbnail(raw_bytes)
    thumb_key = f"thumbnails/{media_id}_thumb.webp"

    s3.put_object(
        Bucket=THUMB_BUCKET,
        Key=thumb_key,
        Body=thumb_bytes,
        ContentType="image/webp"
    )
    return thumb_key


def update_db_status(media_id: str, thumb_key: str):
    """Mark status as 'done' and store thumbnail key in DynamoDB."""
    table.update_item(
        Key={"media_id": media_id},
        UpdateExpression="SET #st = :d, thumbnail_s3_key = :tk",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={":d": "done", ":tk": thumb_key}
    )


def handle_message(msg):
    try:
        body = json.loads(msg["Body"])
        media_id = body["media_id"]
        raw_key = body["raw_s3_key"]
        
        # Process and thumbnail
        thumb_key = process_s3_image(media_id, raw_key)
        update_db_status(media_id, thumb_key)
        
        # Extract and attach metadata
        raw_obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_key)
        raw_bytes = raw_obj["Body"].read()
        meta = extract_metadata(raw_bytes)
        
        table.update_item(
            Key={"media_id": media_id},
            UpdateExpression="SET metadata_info = :m",
            ExpressionAttributeValues={":m": meta}
        )
        
        # Delete from queue to acknowledge receipt
        sqs.delete_message(
            QueueUrl=QUEUE_URL,
            ReceiptHandle=msg["ReceiptHandle"]
        )
        print(f"[Worker] Successfully processed {media_id} with metadata: {meta}")
    except Exception as e:
        print(f"[Worker Error] Error processing message: {e}")


def poll_queue():
    """Continuous SQS long-polling daemon loop."""
    print("Worker running. Listening for messages on auradrive-queue...")
    while True:
        try:
            res = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=10,
                VisibilityTimeout=30
            )
            messages = res.get("Messages", [])
            for msg in messages:
                handle_message(msg)
        except Exception as e:
            print(f"[Worker Error] Polling error: {e}")
        time.sleep(2)


if __name__ == "__main__":
    poll_queue()