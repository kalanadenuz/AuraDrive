# api/main.py
import json
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from boto3.dynamodb.conditions import Key
from fastapi import (
    BackgroundTasks,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

import sys
# Ensure current directory is on sys.path for standalone API execution
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

try:
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
    from api.services.email_service import is_smtp_configured, send_password_reset_email
except ImportError:
    from config import (
        ALLOWED_EXTENSIONS,
        MAX_FILE_SIZE_MB,
        PROCESSED_BUCKET_NAME,
        RAW_BUCKET_NAME,
    )
    from security import (
        create_access_token,
        get_current_user,
        hash_password,
        verify_password,
    )
    from services.aws_service import QUEUE_URL, media_table, s3_client, sqs_client
    from services.email_service import is_smtp_configured, send_password_reset_email


from fastapi.responses import JSONResponse

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


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    import traceback
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {str(exc)}", "traceback": traceback.format_exc()},
    )


@app.get("/api/diag")
def diag():
    return {
        "cloud_provider": os.getenv("CLOUD_PROVIDER"),
        "azure_conn_configured": bool(os.getenv("AZURE_STORAGE_CONNECTION_STRING")),
        "media_table_class": type(media_table).__name__,
        "s3_client_class": type(s3_client).__name__,
    }



@app.get("/")
def root():
    return {
        "service": "AuraDrive Cloud API",
        "status": "online",
        "documentation": "/docs",
        "health": "/health",
    }






class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=10)
    full_name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyResetCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=10)


class BatchMediaRequest(BaseModel):
    media_ids: list[str] = Field(min_length=1)


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


def _get_active_reset_request(email: str) -> dict:
    resp = media_table.get_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"})
    item = resp.get("Item")
    if not item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active password reset request found. Please request a new code.",
        )
    if item.get("attempts", 0) >= 5:
        media_table.delete_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many invalid attempts. For security, this code was invalidated. Please request a new one.",
        )
    expires_at_str = item.get("expires_at", "")
    try:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now(timezone.utc) > expires_at:
            media_table.delete_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code.",
            )
    except (ValueError, TypeError):
        pass
    return item


@app.post("/api/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    email = _email_key(str(req.email))
    user_item = _user_profile(email)
    if not user_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account registered with this email address.",
        )

    # Cryptographically secure 6-digit verification code
    code = f"{secrets.randbelow(1000000):06d}"
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(minutes=15)).isoformat()

    media_table.put_item(
        Item={
            "PK": f"USER#{email}",
            "SK": "PASSWORD_RESET",
            "code_hash": hash_password(code),
            "expires_at": expires_at,
            "attempts": 0,
            "created_at": now.isoformat(),
        }
    )

    # Dispatch email asynchronously in background
    background_tasks.add_task(
        send_password_reset_email,
        to_email=email,
        code=code,
        full_name=user_item.get("full_name", ""),
    )

    resp = {
        "message": "Verification code has been sent to your email.",
        "email": email,
        "expires_in_minutes": 15,
    }
    if not is_smtp_configured():
        resp["dev_code"] = code
        resp["message"] = f"Verification code sent! (No SMTP configured: code is {code})"

    return resp


@app.post("/api/auth/verify-reset-code")
def verify_reset_code(req: VerifyResetCodeRequest):
    email = _email_key(str(req.email))
    code = req.code.strip()
    item = _get_active_reset_request(email)

    if not verify_password(code, item.get("code_hash", "")):
        current_attempts = item.get("attempts", 0) + 1
        media_table.update_item(
            Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"},
            UpdateExpression="SET attempts = :a",
            ExpressionAttributeValues={":a": current_attempts},
        )
        remaining = max(0, 5 - current_attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
        )

    return {
        "valid": True,
        "message": "Verification code confirmed successfully.",
        "email": email,
    }


@app.post("/api/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    email = _email_key(str(req.email))
    code = req.code.strip()
    item = _get_active_reset_request(email)

    if not verify_password(code, item.get("code_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code.",
        )

    # 1. Update user password
    now = datetime.now(timezone.utc).isoformat()
    media_table.update_item(
        Key={"PK": f"USER#{email}", "SK": "PROFILE"},
        UpdateExpression="SET password_hash = :p, updated_at = :u",
        ExpressionAttributeValues={
            ":p": hash_password(req.new_password),
            ":u": now,
        },
    )

    # 2. Invalidate / delete reset code record to prevent replay
    media_table.delete_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"})

    return {
        "message": "Password has been successfully updated. Please sign in with your new password.",
        "email": email,
    }


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


def _get_user_media_item(user_id: str, media_id: str) -> dict | None:
    resp = media_table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"})
    return resp.get("Item")


def _delete_s3_object_safe(bucket: str, key: str | None) -> None:
    if not key:
        return
    try:
        s3_client.delete_object(Bucket=bucket, Key=key)
    except Exception as exc:
        print(f"Warning: failed to delete s3://{bucket}/{key}: {exc}")


def _purge_media_item(user_id: str, media_id: str, item: dict | None = None) -> None:
    """Permanently purges a media item from S3 raw, S3 thumbnails, and DynamoDB."""
    if not item:
        item = _get_user_media_item(user_id, media_id)
    if not item:
        return

    _delete_s3_object_safe(RAW_BUCKET_NAME, item.get("raw_s3_key"))
    _delete_s3_object_safe(PROCESSED_BUCKET_NAME, item.get("thumbnail_s3_key"))
    media_table.delete_item(Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"})


def _format_bytes(bytes_count: int) -> str:
    if bytes_count < 1024:
        return f"{bytes_count} B"
    elif bytes_count < 1024 * 1024:
        return f"{bytes_count / 1024:.1f} KB"
    elif bytes_count < 1024 * 1024 * 1024:
        return f"{bytes_count / (1024 * 1024):.1f} MB"
    else:
        return f"{bytes_count / (1024 * 1024 * 1024):.2f} GB"


@app.get("/api/media/list")
@app.get("/api/media/gallery")
def list_user_media(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}")
        & Key("SK").begins_with("MEDIA#")
    )
    items = response.get("Items", [])
    active_items = [i for i in items if not i.get("is_trashed")]

    for item in active_items:
        # 1. Full-Resolution Raw Image URL
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

        # 2. Thumbnail URL
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

    return active_items


# ----------------------------------------------------------------------
# STATIC MEDIA ROUTES (Must precede /{media_id} dynamic routes)
# ----------------------------------------------------------------------

@app.get("/api/media/trash")
def list_trash(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}")
        & Key("SK").begins_with("MEDIA#")
    )
    items = response.get("Items", [])
    now = datetime.now(timezone.utc)

    valid_trashed = []
    for item in items:
        if not item.get("is_trashed"):
            continue

        deleted_at_str = item.get("deleted_at")
        if deleted_at_str:
            try:
                deleted_dt = datetime.fromisoformat(deleted_at_str)
                if deleted_dt.tzinfo is None:
                    deleted_dt = deleted_dt.replace(tzinfo=timezone.utc)
                age_seconds = (now - deleted_dt).total_seconds()
                # 7-day auto-purge condition: 7 days = 604,800 seconds
                if age_seconds >= 7 * 86400:
                    _purge_media_item(user_id, item["media_id"], item)
                    continue
                days_left = max(1, 7 - int(age_seconds / 86400))
                item["days_remaining"] = days_left
            except Exception:
                item["days_remaining"] = 7
        else:
            item["days_remaining"] = 7

        # Generate URLs
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

        thumb_key = item.get("thumbnail_s3_key")
        if thumb_key:
            try:
                thumb_url = s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": PROCESSED_BUCKET_NAME, "Key": thumb_key},
                    ExpiresIn=3600,
                )
                item["thumbnail_url"] = _rewrite_localstack_url(thumb_url)
            except Exception:
                item["thumbnail_url"] = None

        valid_trashed.append(item)

    return valid_trashed


@app.post("/api/media/trash/batch")
def batch_move_to_trash(req: BatchMediaRequest, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    deleted_at = now.isoformat()
    ttl_epoch = int(now.timestamp()) + 7 * 86400

    trashed_ids = []
    for m_id in req.media_ids:
        try:
            media_table.update_item(
                Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{m_id}"},
                UpdateExpression="SET is_trashed = :tr, deleted_at = :da, #ttl = :ttl, updated_at = :ua",
                ExpressionAttributeNames={"#ttl": "ttl"},
                ExpressionAttributeValues={
                    ":tr": True,
                    ":da": deleted_at,
                    ":ttl": ttl_epoch,
                    ":ua": deleted_at,
                },
            )
            trashed_ids.append(m_id)
        except Exception:
            pass

    return {
        "message": f"Moved {len(trashed_ids)} items to recycle bin.",
        "media_ids": trashed_ids,
        "auto_clear_days": 7,
    }


@app.delete("/api/media/trash/empty")
def empty_trash(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}")
        & Key("SK").begins_with("MEDIA#")
    )
    items = response.get("Items", [])
    count = 0
    for item in items:
        if item.get("is_trashed"):
            _purge_media_item(user_id, item["media_id"], item)
            count += 1

    return {"message": f"Permanently deleted {count} items from recycle bin.", "purged_count": count}


@app.post("/api/media/restore/batch")
def batch_restore(req: BatchMediaRequest, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    now = datetime.now(timezone.utc).isoformat()
    restored_ids = []
    for m_id in req.media_ids:
        try:
            media_table.update_item(
                Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{m_id}"},
                UpdateExpression="REMOVE is_trashed, deleted_at, #ttl SET updated_at = :ua, is_trashed = :not_tr",
                ExpressionAttributeNames={"#ttl": "ttl"},
                ExpressionAttributeValues={":ua": now, ":not_tr": False},
            )
            restored_ids.append(m_id)
        except Exception:
            pass

    return {"message": f"Restored {len(restored_ids)} items to gallery.", "media_ids": restored_ids}


@app.get("/api/media/usage")
def get_storage_usage(user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    response = media_table.query(
        KeyConditionExpression=Key("PK").eq(f"USER#{user_id}")
        & Key("SK").begins_with("MEDIA#")
    )
    items = response.get("Items", [])

    active_bytes = 0
    trash_bytes = 0
    active_count = 0
    trash_count = 0

    for item in items:
        size = int(item.get("file_size_bytes") or 0)
        if item.get("is_trashed"):
            trash_bytes += size
            trash_count += 1
        else:
            active_bytes += size
            active_count += 1

    total_bytes = active_bytes + trash_bytes
    quota_bytes = int(os.getenv("USER_STORAGE_QUOTA_BYTES", str(5 * 1024 * 1024 * 1024)))  # 5 GB free tier
    percentage = min(100.0, round((total_bytes / quota_bytes) * 100, 2)) if quota_bytes > 0 else 0.0

    return {
        "active_bytes": active_bytes,
        "active_formatted": _format_bytes(active_bytes),
        "active_count": active_count,
        "trash_bytes": trash_bytes,
        "trash_formatted": _format_bytes(trash_bytes),
        "trash_count": trash_count,
        "total_bytes": total_bytes,
        "total_formatted": _format_bytes(total_bytes),
        "quota_bytes": quota_bytes,
        "quota_formatted": _format_bytes(quota_bytes),
        "used_percentage": percentage,
    }


# ----------------------------------------------------------------------
# PARAMETERIZED MEDIA ROUTES
# ----------------------------------------------------------------------

@app.get("/api/media/{media_id}")
def get_media_detail(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    item = _get_user_media_item(user_id, media_id)
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


@app.get("/api/media/{media_id}/download")
def get_media_download_url(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    item = _get_user_media_item(user_id, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found.")

    raw_key = item.get("raw_s3_key")
    if not raw_key:
        raise HTTPException(status_code=404, detail="Raw asset not available for download.")

    filename = item.get("original_filename") or f"{item.get('title', 'image')}.jpg"
    download_url = _rewrite_localstack_url(
        s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": RAW_BUCKET_NAME,
                "Key": raw_key,
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
            },
            ExpiresIn=3600,
        )
    )
    return {"download_url": download_url, "filename": filename}


@app.post("/api/media/{media_id}/trash")
def move_media_to_trash(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    item = _get_user_media_item(user_id, media_id)
    if not item:
        raise HTTPException(status_code=404, detail="Media item not found.")

    now = datetime.now(timezone.utc)
    deleted_at = now.isoformat()
    ttl_epoch = int(now.timestamp()) + 7 * 86400  # 7-day auto-clear TTL

    media_table.update_item(
        Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
        UpdateExpression="SET is_trashed = :tr, deleted_at = :da, #ttl = :ttl, updated_at = :ua",
        ExpressionAttributeNames={"#ttl": "ttl"},
        ExpressionAttributeValues={
            ":tr": True,
            ":da": deleted_at,
            ":ttl": ttl_epoch,
            ":ua": deleted_at,
        },
    )
    return {"message": "Moved to recycle bin.", "media_id": media_id, "auto_clear_days": 7}


@app.post("/api/media/{media_id}/restore")
def restore_media(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    media_table.update_item(
        Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
        UpdateExpression="REMOVE is_trashed, deleted_at, #ttl SET updated_at = :ua, is_trashed = :not_tr",
        ExpressionAttributeNames={"#ttl": "ttl"},
        ExpressionAttributeValues={
            ":ua": datetime.now(timezone.utc).isoformat(),
            ":not_tr": False,
        },
    )
    return {"message": "Item restored to gallery.", "media_id": media_id}


@app.delete("/api/media/{media_id}/permanent")
def permanently_delete_media(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    _purge_media_item(user_id, media_id)
    return {"message": "Item permanently deleted.", "media_id": media_id}


# ----------------------------------------------------------------------
# PUBLIC SHARE LINK (VIEW WITHOUT LOGIN)
# ----------------------------------------------------------------------

@app.post("/api/media/{media_id}/share")
def create_share_link(media_id: str, user: dict = Depends(get_current_user)):
    user_id = user["user_id"]
    user_email = user.get("email")
    item = _get_user_media_item(user_id, media_id)
    if not item or item.get("is_trashed"):
        raise HTTPException(status_code=404, detail="Media item not found or is in recycle bin.")

    share_id = item.get("share_id")
    now = datetime.now(timezone.utc).isoformat()

    owner_profile = _user_profile(user_email) if user_email else None
    owner_name = owner_profile.get("full_name") if owner_profile else "AuraDrive User"

    if not share_id:
        share_id = secrets.token_urlsafe(12)
        media_table.update_item(
            Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"},
            UpdateExpression="SET share_id = :s",
            ExpressionAttributeValues={":s": share_id},
        )
        media_table.put_item(
            Item={
                "PK": f"SHARE#{share_id}",
                "SK": "METADATA",
                "share_id": share_id,
                "user_id": user_id,
                "owner_name": owner_name,
                "media_id": media_id,
                "created_at": now,
            }
        )

    return {
        "share_id": share_id,
        "share_url": f"/?share={share_id}",
        "message": "Share link ready.",
    }


@app.get("/api/public/share/{share_id}")
def get_public_share(share_id: str):
    share_resp = media_table.get_item(Key={"PK": f"SHARE#{share_id}", "SK": "METADATA"})
    share_item = share_resp.get("Item")
    if not share_item:
        raise HTTPException(status_code=404, detail="Shared media link not found or has expired.")

    user_id = share_item["user_id"]
    media_id = share_item["media_id"]
    owner_name = share_item.get("owner_name") or "AuraDrive User"

    media_resp = media_table.get_item(Key={"PK": f"USER#{user_id}", "SK": f"MEDIA#{media_id}"})
    item = media_resp.get("Item")
    if not item or item.get("is_trashed"):
        raise HTTPException(status_code=404, detail="This shared item is no longer available.")

    raw_key = item.get("raw_s3_key")
    full_url = None
    download_url = None
    if raw_key:
        filename = item.get("original_filename") or f"{item.get('title', 'image')}.jpg"
        full_url = _rewrite_localstack_url(
            s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": RAW_BUCKET_NAME, "Key": raw_key},
                ExpiresIn=7200,
            )
        )
        download_url = _rewrite_localstack_url(
            s3_client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": RAW_BUCKET_NAME,
                    "Key": raw_key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=7200,
            )
        )

    thumb_key = item.get("thumbnail_s3_key")
    thumb_url = None
    if thumb_key:
        thumb_url = _rewrite_localstack_url(
            s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": PROCESSED_BUCKET_NAME, "Key": thumb_key},
                ExpiresIn=7200,
            )
        )

    return {
        "media_id": media_id,
        "title": item.get("title", "Untitled Image"),
        "original_filename": item.get("original_filename"),
        "full_image_url": full_url,
        "download_url": download_url,
        "thumbnail_url": thumb_url,
        "width": item.get("width"),
        "height": item.get("height"),
        "format": item.get("media_format") or item.get("format") or "IMAGE",
        "file_size_bytes": item.get("file_size_bytes"),
        "created_at": item.get("created_at"),
        "owner_name": owner_name,
        "exif": item.get("exif", {}),
    }