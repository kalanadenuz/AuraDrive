# worker/worker.py
import boto3
from worker.config import AWS_ENDPOINT_URL, RAW_BUCKET, THUMB_BUCKET
from worker.image_processor import create_thumbnail

s3 = boto3.client("s3", endpoint_url=AWS_ENDPOINT_URL, region_name="us-east-1")

def process_s3_image(media_id: str, raw_key: str) -> str:
    raw_obj = s3.get_object(Bucket=RAW_BUCKET, Key=raw_key)
    raw_bytes = raw_obj["Body"].read()
    thumb_bytes = create_thumbnail(raw_bytes)
    thumb_key = f"thumbnails/{media_id}_thumb.webp"
    s3.put_object(
        Bucket=THUMB_BUCKET,
        Key=thumb_key,
        Body=thumb_bytes,
        ContentType="image/webp"
    )
    return thumb_key