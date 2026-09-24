# worker/config.py
import os

AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
QUEUE_URL = f"{AWS_ENDPOINT_URL}/000000000000/auradrive-queue"
RAW_BUCKET = "auradrive-raw"
THUMB_BUCKET = "auradrive-thumbnails"