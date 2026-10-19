import io
import json
import uuid
from datetime import datetime, timezone
import boto3
from PIL import Image

# 1. Setup LocalStack endpoints
LOCALSTACK_URL = "http://localhost:4566"
REGION = "us-east-1"
RAW_BUCKET = "auradrive-raw"
DYNAMODB_TABLE = "AuraDrive_Media"
QUEUE_URL = f"{LOCALSTACK_URL}/000000000000/auradrive-queue"

# 2. Connect to LocalStack S3, SQS, and DynamoDB
s3_client = boto3.client(
    "s3",
    endpoint_url=LOCALSTACK_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=REGION
)

sqs_client = boto3.client(
    "sqs",
    endpoint_url=LOCALSTACK_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=REGION
)

dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url=LOCALSTACK_URL,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name=REGION
)
table = dynamodb.Table(DYNAMODB_TABLE)


def create_fake_image() -> bytes:
    """Creates a real in-memory JPEG picture so the worker doesn't crash."""
    buffer = io.BytesIO()
    img = Image.new("RGB", (300, 300), color="purple")
    img.save(buffer, format="JPEG")
    return buffer.getvalue()


def send_mock_test_job():
    # Generate unique test data
    media_id = str(uuid.uuid4())
    raw_s3_key = f"raw/{media_id}_mock_test.jpg"
    timestamp = datetime.now(timezone.utc).isoformat()

    print(f"\n--- Starting Mock Injection ---")
    print(f"Generated Media ID: {media_id}")

    # 1. Put raw image directly into S3
    image_bytes = create_fake_image()
    s3_client.put_object(
        Bucket=RAW_BUCKET,
        Key=raw_s3_key,
        Body=image_bytes,
        ContentType="image/jpeg"
    )
    print(f"[Step 1] Fake image uploaded to S3: {raw_s3_key}")

    # 2. Put 'pending' record into DynamoDB
    table.put_item(
        Item={
            "media_id": media_id,
            "title": "Mock QA Worker Test",
            "raw_s3_key": raw_s3_key,
            "status": "pending",
            "created_at": timestamp
        }
    )
    print(f"[Step 2] DynamoDB record created with status: 'pending'")

    # 3. Drop processing message into SQS queue
    payload = {
        "media_id": media_id,
        "raw_s3_key": raw_s3_key
    }
    sqs_client.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(payload)
    )
    print(f"[Step 3] Message successfully injected into SQS queue!")
    print(f"--> Now watch your worker terminal to see it process {media_id}!\n")


if __name__ == "__main__":
    send_mock_test_job()