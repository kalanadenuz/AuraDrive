import os
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
AWS_REGION = "us-east-1"
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {"image/jpeg", "image/png", "image/webp"}
RAW_BUCKET_NAME = os.getenv("RAW_BUCKET_NAME", "auradrive-raw")
PROCESSED_BUCKET_NAME = os.getenv("PROCESSED_BUCKET_NAME", "auradrive-thumbnails")