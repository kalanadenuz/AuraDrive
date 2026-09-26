import boto3
from botocore.config import Config
from api.config import AWS_ENDPOINT_URL, AWS_REGION

# Force path-style addressing for LocalStack S3 reliability
s3_config = Config(s3={"addressing_style": "path"})

s3_client = boto3.client(
    "s3",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test",
    config=s3_config,
)

sqs_client = boto3.client(
    "sqs",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test",
)

dynamodb_res = boto3.resource(
    "dynamodb",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test",
)

media_table = dynamodb_res.Table("AuraDrive_Media")
QUEUE_URL = f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue"