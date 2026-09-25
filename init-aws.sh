#!/bin/bash
# OWNER: Database Administrator & Project Lead
# TASK: Write bash commands using `awslocal` to auto-create the S3 bucket, SQS queue, and DynamoDB table.
# DETAILS: Must define the exact DynamoDB partition key (media_id).
#!/bin/bash
set -eo pipefail
echo "Initializing AuraDrive AWS resources..."


# 1. Create S3 Buckets
awslocal s3 mb s3://auradrive-media
awslocal s3 mb s3://auradrive-raw # for raw media files
awslocal s3 mb s3://auradrive-thumbnails # for processed thumbnails
echo "S3 buckets initialized."

# 2. Create SQS Queues (Main and Dead-Letter Queue)
awslocal sqs create-queue --queue-name auradrive-dlq

#  Retrieve DLQ ARN
DLQ_ARN=$(awslocal sqs get-queue-attributes \
    --queue-url http://localhost:4566/000000000000/auradrive-dlq \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text)

# Create the Main Queue with RedrivePolicy attached
awslocal sqs create-queue \
    --queue-name auradrive-queue \
    --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

echo "SQS Queue initialized."

# 3. Create DynamoDB Table (Partition Key: media_id)
awslocal dynamodb create-table \
    --table-name AuraDrive_Media \
    --attribute-definitions AttributeName=media_id,AttributeType=S \
    --key-schema AttributeName=media_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB AuraDrive_Media table initialized successfully."


echo "Starting AuraDrive LocalStack initialization script..."


# Update create-table to include GSI attributes
awslocal dynamodb create-table \
    --table-name AuraDrive_Media \
    --attribute-definitions \
        AttributeName=media_id,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=created_at,AttributeType=S \
    --key-schema \
        AttributeName=media_id,KeyType=HASH \
    --global-secondary-indexes '[
        {
            "IndexName": "StatusIndex",
            "KeySchema": [
                {"AttributeName": "status", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"}
            ],
            "Projection": {"ProjectionType": "ALL"}
        }
    ]' \
    --billing-mode PAY_PER_REQUEST