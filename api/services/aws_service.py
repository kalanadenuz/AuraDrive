# api/services/aws_service.py
import os
import boto3
from botocore.config import Config

try:
    from api.config import AWS_ENDPOINT_URL, AWS_REGION
except ImportError:
    AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
    AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

TABLE_NAME = os.getenv("TABLE_NAME", "AuraDrive_Storage")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "test")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "test")

# Path-style addressing ensures LocalStack S3 DNS works cleanly inside Docker
s3_config = Config(s3={"addressing_style": "path"})

s3_client = boto3.client(
    "s3",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    config=s3_config,
)

sqs_client = boto3.client(
    "sqs",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

dynamodb_res = boto3.resource(
    "dynamodb",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

media_table = dynamodb_res.Table(TABLE_NAME)
QUEUE_URL = os.getenv("QUEUE_URL", f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue")