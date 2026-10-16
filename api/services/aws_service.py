import boto3
from api.config import AWS_ENDPOINT_URL, AWS_REGION

s3_client = boto3.client("s3", endpoint_url=AWS_ENDPOINT_URL, region_name=AWS_REGION)
sqs_client = boto3.client("sqs", endpoint_url=AWS_ENDPOINT_URL, region_name=AWS_REGION)
dynamodb_res = boto3.resource("dynamodb", endpoint_url=AWS_ENDPOINT_URL, region_name=AWS_REGION)
media_table = dynamodb_res.Table("AuraDrive_Media")
QUEUE_URL = f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue"