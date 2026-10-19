import os

# AWS / LocalStack Networking
AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION", "us-east-1"))
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "test")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "test")

# Storage & Tables
RAW_BUCKET_NAME = os.getenv("RAW_BUCKET_NAME", "auradrive-raw")
PROCESSED_BUCKET_NAME = os.getenv("PROCESSED_BUCKET_NAME", "auradrive-thumbnails")
TABLE_NAME = os.getenv("TABLE_NAME", "AuraDrive_Storage")
QUEUE_URL = os.getenv("QUEUE_URL", f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue")

# File Upload Constraints
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# Security & Multi-Tenant Authentication
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "AURADRIVE_DEV_LOCAL_SECRET_KEY_2026_SECURE")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 24)))  # 24 hours