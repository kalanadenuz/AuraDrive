# api/routes/upload.py
import os
import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from api.services.aws_service import s3_client, media_table, sqs_client
from api.security import get_current_user

router = APIRouter()

RAW_BUCKET = os.getenv("RAW_BUCKET_NAME", "auradrive-raw")
QUEUE_URL = os.getenv("QUEUE_URL", "http://localstack:4566/000000000000/auradrive-queue")

ALLOWED_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
}

@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_media(
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts multipart image uploads, saves binary to user-isolated S3 path,
    initializes state in DynamoDB, and enqueues job into SQS for processing.
    """
    # 1. Validate MIME type
    content_type = file.content_type
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{content_type}'. Allowed types: JPEG, PNG, WEBP, GIF."
        )

    user_id = current_user["user_id"]
    media_id = str(uuid.uuid4())
    ext = ALLOWED_MIME_TYPES[content_type]
    raw_s3_key = f"users/{user_id}/raw/{media_id}.{ext}"

    # 2. Upload raw binary stream directly to S3
    try:
        s3_client.upload_fileobj(
            file.file,
            RAW_BUCKET,
            raw_s3_key,
            ExtraArgs={"ContentType": content_type}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write image to S3: {str(e)}"
        )

    # 3. Create initial state record in DynamoDB
    now = datetime.now(timezone.utc).isoformat()
    db_item = {
        "PK": f"USER#{user_id}",
        "SK": f"MEDIA#{media_id}",
        "media_id": media_id,
        "user_id": user_id,
        "title": title.strip(),
        "original_filename": file.filename,
        "content_type": content_type,
        "raw_s3_key": raw_s3_key,
        "status": "pending",
        "created_at": now,
        "GSI1PK": f"USER#{user_id}#STATUS#pending",
        "GSI1SK": now
    }

    try:
        media_table.put_item(Item=db_item)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record state in DynamoDB: {str(e)}"
        )

    # 4. Dispatch job to SQS for background worker processing
    message_payload = {
        "media_id": media_id,
        "user_id": user_id,
        "raw_s3_key": raw_s3_key,
        "title": title.strip(),
        "content_type": content_type
    }

    try:
        sqs_client.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message_payload)
        )
    except Exception as e:
        # Non-blocking warning: worker will rely on backup sweep or retry
        print(f"[WARN] Failed to enqueue message to SQS: {str(e)}")

    return {
        "media_id": media_id,
        "status": "pending",
        "title": title.strip(),
        "message": "Asset uploaded successfully and queued for thumbnail generation."
    }