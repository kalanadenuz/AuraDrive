# api/main.py
import json
import os
import uuid
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

from api.config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_MB,
    PROCESSED_BUCKET_NAME,
    RAW_BUCKET_NAME,
)
from api.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from api.services.aws_service import QUEUE_URL, media_table, s3_client, sqs_client


app = FastAPI(
    title="AuraDrive API - Multi-Tenant Cloud Edition",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def _email_key(email: str) -> str:
    return email.strip().lower()


def _user_profile(email: str) -> dict | None:
    response = media_table.get_item(
        Key={"PK": f"USER#{email}", "SK": "PROFILE"}
    )
    return response.get("Item")


def _rewrite_localstack_url(url: str | None) -> str | None:
    """Rewrite internal Docker DNS to localhost for host browser consumption."""
    if not url:
        return None
    if "localstack:4566" in url:
        return url.replace("localstack:4566", "localhost:4566")
    return url


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "auradrive-api"}


@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest):
    email = _email_key(str(req.email))
    if _user_profile(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this email already exists.",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    media_table.put_item(
        Item={
            "PK": f"USER#{email}",
            "SK": "PROFILE",
            "user_id": user_id,
            "email": email,
            "password_hash": hash_password(req.password),
            "full_name": req.full_name,
            "created_at": now,
        },
        ConditionExpression="attribute_not_exists(PK)",
    )
    token = create_access_token({"sub": user_id, "email": email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"user_id": user_id, "email": email, "full_name": req.full_name},
    }


@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = _email_key(str(req.email))
    user_item = _user_profile(email)
    if not user_item or not verify_password(
        req.password, user_item.get("password_hash", "")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": user_item["user_id"], "email": email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user_item["user_id"],
            "email": email,
            "full_name": user_item.get("full_name", ""),
        },
    }


@app.get("/api/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return user


def _validate_uploaded_file(file: UploadFile, contents: bytes) -> None:
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type {file.content_type}. Allowed: JPEG, PNG, WEBP, GIF.",
        )
    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {MAX_FILE_SIZE_MB} MB limit.",
        )


@app.post("/api/media/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_media(
    file: UploadFile = File(...),
    title: str = Form(...),
    user: dict = Depends(get_current_user),
):
    contents = await file.read()
    _validate_uploaded_file(file, contents)

    media_id = str(uuid.uuid4())
    user_id = user["user_id"]
    filename = file.filename or "upload"
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    raw_s3_key = f"users/{user_id}/raw/{media_id}.{extension}"

    s3_client.put_object(
        Bucket=RAW_BUCKET_NAME,
        Key=raw_s3_key,
        Body=contents,
        ContentType=file.content_type,
    )

    now = datetime.now(timezone.utc).isoformat()
    media_table.put_item(
        Item={
            "PK": f"USER#{user_id}",
            "SK": f"MEDIA#{media_id}",
            "media_id": media_id,
            "user_id": user_id,
            "title": title.strip(),
            "original_filename": filename,
            "content_type": file.content_type,
            "status": "pending",
            "raw_s3_key": raw_s3_key,
            "created_at": now,
            "GSI1PK": f"USER#{user_id}#STATUS#pending",
            "GSI1SK": now,
        }
    )

    sqs_client.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(
            {
                "media_id": media_id,
                "user_id": user_id,
                "raw_s3_key": raw_s3_key,
                "title": title.strip(),
            }
        ),
    )
    return {
        "media_id": media_id,
        "status": "pending",
        "message": "File received and queued for processing.",
    }


@app.get("/api/media/list")
def list_user_media(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}")
        & Key("SK").begins_with("MEDIA#")
    )
    items = response.get("Items", [])

    for item in items:
        # 1. Full-Resolution Raw Image URL (for click/tap preview modal)
        raw_key = item.get("raw_s3_key")
        if raw_key:
            try:
                raw_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": RAW_BUCKET_NAME, "Key": raw_key},
                    ExpiresIn=3600,
                )
                item["full_image_url"] = _rewrite_localstack_url(raw_url)
            except Exception:
                item["full_image_url"] = None

        # 2. Thumbnail URL (for dashboard grid)
        thumbnail_key = item.get("thumbnail_s3_key")
        if item.get("status") == "done" and thumbnail_key:
            try:
                thumb_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": PROCESSED_BUCKET_NAME, "Key": thumbnail_key},
                    ExpiresIn=3600,
                )
                item["thumbnail_url"] = _rewrite_localstack_url(thumb_url)
            except Exception:
                item["thumbnail_url"] = None

    return items


@app.get("/api/media/{media_id}")
def get_media_detail(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.get_item(
        Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"}
    )
    item = response.get("Item")
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media item not found in your space.",
        )

    raw_key = item.get("raw_s3_key")
    if raw_key:
        raw_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": RAW_BUCKET_NAME, "Key": raw_key},
            ExpiresIn=3600,
        )
        item["full_image_url"] = _rewrite_localstack_url(raw_url)

    thumb_key = item.get("thumbnail_s3_key")
    if thumb_key:
        thumb_url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": PROCESSED_BUCKET_NAME, "Key": thumb_key},
            ExpiresIn=3600,
        )
        item["thumbnail_url"] = _rewrite_localstack_url(thumb_url)

    return item