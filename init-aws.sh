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
awslocal sqs create-queue --queue-name auradrive-queue
echo "SQS Queue initialized."

# 3. Create DynamoDB Table (Partition Key: media_id)
awslocal dynamodb create-table \
    --table-name AuraDrive_Media \
    --attribute-definitions AttributeName=media_id,AttributeType=S \
    --key-schema AttributeName=media_id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

echo "DynamoDB AuraDrive_Media table initialized successfully."
