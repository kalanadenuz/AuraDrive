import os

AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
QUEUE_URL = f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue"
RAW_BUCKET = "auradrive-raw"
THUMB_BUCKET = "auradrive-thumbnails"
TABLE_NAME = "AuraDrive_Media"

# LocalStack dummy credentials
AWS_ACCESS_KEY_ID = "test"
AWS_SECRET_ACCESS_KEY = "test"