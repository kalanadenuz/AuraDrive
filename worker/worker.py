# OWNER: Worker / Processing Developer
# TASK: Build the fault-tolerant background processor.
# FUNCTIONS TO CODE:
# 1. `poll_queue()`: Infinite loop checking SQS for messages.
# 2. `process_image()`: Download from S3, use Pillow to extract EXIF, and generate WebP thumbnail.
# 3. `update_database()`: Idempotent DynamoDB conditional update to mark status="done".
# 4. `delete_message()`: Remove task from SQS only if processing succeeds.

import time
import json
import boto3

# Connect to SQS on LocalStack
sqs = boto3.client(
    "sqs",
    endpoint_url="http://localhost:4566",
    aws_access_key_id="test",
    aws_secret_access_key="test",
    region_name="us-east-1"
)

QUEUE_URL = "http://localhost:4566/000000000000/auradrive-queue"

def fetch_messages():
    """Fetch messages using long-polling with 30s visibility timeout."""
    response = sqs.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=10,
        VisibilityTimeout=30
    )
    return response.get("Messages", [])

def start_worker():
    """Main consumer loop polling messages indefinitely."""
    print("Worker running. Listening for messages on auradrive-queue...")
    while True:
        try:
            messages = fetch_messages()
            for msg in messages:
                body = json.loads(msg["Body"])
                receipt_handle = msg["ReceiptHandle"]
                print(f"[Worker] Processing job: {body}")

                # Delete message to acknowledge successful consumption
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=receipt_handle
                )
                print("[Worker] Job processed and removed from queue.")
        except Exception as e:
            print(f"[Worker Error] Processing failure: {e}")
        time.sleep(2)

if __name__ == "__main__":
    start_worker()