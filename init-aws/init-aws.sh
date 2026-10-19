#!/bin/bash
set -e
echo "Starting Cloud AWS / LocalStack Primitive Provisioning..."
export AWS_DEFAULT_REGION=us-east-1
AWSCMD="awslocal"
if ! command -v awslocal &> /dev/null; then
  AWSCMD="aws --endpoint-url=http://localhost:4566"
fi

CORS_CONFIG='{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedOrigins": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# 1. Create S3 Buckets & Attach CORS to Both
echo "Creating S3 Buckets..."
$AWSCMD s3 mb s3://auradrive-raw || true
$AWSCMD s3 mb s3://auradrive-thumbnails || true

echo "Applying CORS Policies..."
$AWSCMD s3api put-bucket-cors --bucket auradrive-raw --cors-configuration "$CORS_CONFIG"
$AWSCMD s3api put-bucket-cors --bucket auradrive-thumbnails --cors-configuration "$CORS_CONFIG"

# 2. Create SQS Dead-Letter Queue and Primary Queue
echo "Creating SQS Queues..."
DLQ_URL=$($AWSCMD sqs create-queue --queue-name auradrive-dlq --output text --query 'QueueUrl')
DLQ_ARN=$($AWSCMD sqs get-queue-attributes --queue-url "$DLQ_URL" --attribute-names QueueArn --output text --query 'Attributes.QueueArn')
$AWSCMD sqs create-queue --queue-name auradrive-queue --attributes '{
  "ReceiveMessageWaitTimeSeconds": "20",
  "VisibilityTimeout": "60",
  "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":\"3\"}"
}'

# 3. Create DynamoDB Single-Table Schema
echo "Creating DynamoDB Schema (AuraDrive_Storage)..."
$AWSCMD dynamodb create-table \
  --table-name AuraDrive_Storage \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "GSI1",
      "KeySchema": [
        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
      ],
      "Projection": {
        "ProjectionType": "ALL"
      }
    }
  ]' || true

echo "--- Initialized AWS Resources ---"
$AWSCMD s3 ls
$AWSCMD sqs list-queues
$AWSCMD dynamodb list-tables
echo "✅ AWS Primitives Provisioned Successfully!"