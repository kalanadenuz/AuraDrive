# api/routes/gallery.py
from fastapi import APIRouter, HTTPException, Depends, status
from boto3.dynamodb.conditions import Key
from api.services.aws_service import media_table, s3_client
from api.security import get_current_user
import os

router = APIRouter()

RAW_BUCKET = os.getenv("RAW_BUCKET_NAME", "auradrive-raw")
THUMB_BUCKET = os.getenv("PROCESSED_BUCKET_NAME", "auradrive-thumbnails")

@router.get("/media/list", status_code=status.HTTP_200_OK)
async def list_media(current_user: dict = Depends(get_current_user)):
    """
    Query DynamoDB for items owned strictly by the authenticated user.
    Generates pre-signed URLs for both thumbnail and full-resolution raw image,
    and returns all extracted metadata for frontend modal inspection.
    """
    user_id = current_user["user_id"]
    try:
        # Query user partition: PK = USER#<user_id> and SK begins with MEDIA#
        res = media_table.query(
            KeyConditionExpression=Key("PK").eq(f"USER#{user_id}") & Key("SK").begins_with("MEDIA#")
        )
        items = res.get("Items", [])

        # Hydrate pre-signed URLs
        for item in items:
            # 1. Full-Resolution Raw Image URL (for click/tap preview modal)
            raw_key = item.get("raw_s3_key")
            if raw_key:
                try:
                    item["full_image_url"] = s3_client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": RAW_BUCKET, "Key": raw_key},
                        ExpiresIn=3600
                    )
                except Exception:
                    item["full_image_url"] = None

            # 2. Thumbnail WebP URL (for the grid preview)
            thumb_key = item.get("thumbnail_s3_key")
            if thumb_key and item.get("status") == "done":
                try:
                    item["thumbnail_url"] = s3_client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": THUMB_BUCKET, "Key": thumb_key},
                        ExpiresIn=3600
                    )
                except Exception:
                    item["thumbnail_url"] = None
            else:
                item["thumbnail_url"] = None

        return {"items": items}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query gallery items: {str(e)}"
        )