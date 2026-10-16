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
    """Continuous SQS long-polling daemon loop."""
    print("[*] Worker active. Long-polling SQS on auradrive-queue...")
    while True:
        try:
            resp = sqs.receive_message(
                QueueUrl=QUEUE_URL,
                MaxNumberOfMessages=5,
                WaitTimeSeconds=20,
                VisibilityTimeout=60
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


if __name__ == "__main__":
    poll_loop()