import base64
import json
import logging
import os
from datetime import datetime, timezone
import azure.functions as func

from image_processor import create_thumbnail
from metadata import extract_metadata

app = func.FunctionApp()

RAW_BUCKET = os.getenv("RAW_BUCKET", "auradrive-raw")
THUMB_BUCKET = os.getenv("THUMB_BUCKET", "auradrive-thumbnails")
TABLE_NAME = os.getenv("TABLE_NAME", "AuraDriveStorage")


def _sanitize_key(key: str) -> str:
    r"""Azure Table Storage strictly disallows: / \ # ? and control chars in PartitionKey and RowKey."""
    return (
        str(key)
        .replace("#", "___HASH___")
        .replace("/", "___SLASH___")
        .replace("\\", "___BSLASH___")
        .replace("?", "___QMARK___")
    )


@app.queue_trigger(
    arg_name="msg",
    queue_name="auradrive-queue",
    connection="AZURE_STORAGE_CONNECTION_STRING",
)
def process_photo_job(msg: func.QueueMessage) -> None:
    """
    Azure Function (Serverless Background Worker - AWS Lambda equivalent).
    Automatically triggers when a photo upload message arrives on 'auradrive-queue':
    1. Downloads raw image from 'auradrive-raw' blob container.
    2. Extracts technical EXIF, GPS, camera metadata, and dimensions via Pillow.
    3. Generates high-quality WebP thumbnail.
    4. Uploads WebP thumbnail to 'auradrive-thumbnails' blob container.
    5. Updates status to 'done' in Azure Table Storage 'AuraDriveStorage'.
    """
    from azure.storage.blob import BlobServiceClient, ContentSettings
    from azure.data.tables import TableServiceClient, UpdateMode

    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING") or os.getenv("AzureWebJobsStorage", "")
    if not conn_str:
        logging.error("AZURE_STORAGE_CONNECTION_STRING is missing in Function App settings!")
        return

    # Decode message body (supports both plain UTF-8 text and Base64)
    raw_bytes = msg.get_body()
    data = None
    try:
        raw_text = raw_bytes.decode("utf-8")
        data = json.loads(raw_text)
    except Exception:
        try:
            decoded_text = base64.b64decode(raw_bytes).decode("utf-8")
            data = json.loads(decoded_text)
        except Exception as err:
            logging.error(f"Failed to decode or parse queue message JSON: {err}")
            return

    logging.info(f"⚡ [Azure Function Worker] Processing job: {data}")

    media_id = data.get("media_id")
    user_id = data.get("user_id")
    raw_s3_key = data.get("raw_s3_key")

    if not media_id or not user_id or not raw_s3_key:
        logging.warning(f"Malformed queue message payload: {data}")
        return

    # Sanitize PartitionKey and RowKey to match Azure Table Storage conventions used by API
    raw_pk = f"USER#{user_id}"
    raw_sk = f"MEDIA#{media_id}"
    pk = _sanitize_key(raw_pk)
    rk = _sanitize_key(raw_sk)

    blob_service = BlobServiceClient.from_connection_string(conn_str)
    table_service = TableServiceClient.from_connection_string(conn_str)
    table_client = table_service.get_table_client(TABLE_NAME)

    try:
        # 1. Download original raw asset from Azure Blob Storage
        raw_blob = blob_service.get_blob_client(container=RAW_BUCKET, blob=raw_s3_key)
        image_bytes = raw_blob.download_blob().readall()
        logging.info(f"Downloaded {len(image_bytes)} bytes for media_id={media_id}")

        # 2. Extract technical EXIF, GPS & camera metadata
        meta = extract_metadata(image_bytes)

        # 3. Create WebP thumbnail using Pillow
        thumb_bytes = create_thumbnail(image_bytes)
        thumb_key = f"users/{user_id}/thumbnails/{media_id}.webp"

        # 4. Upload thumbnail to Azure Blob Storage (ensure container exists first)
        thumb_container = blob_service.get_container_client(THUMB_BUCKET)
        try:
            if not thumb_container.exists():
                thumb_container.create_container()
        except Exception as c_err:
            logging.warning(f"Container ensure warning: {c_err}")

        thumb_blob = blob_service.get_blob_client(container=THUMB_BUCKET, blob=thumb_key)
        thumb_blob.upload_blob(
            thumb_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type="image/webp"),
        )
        logging.info(f"Uploaded thumbnail to {thumb_key}")

        now = datetime.now(timezone.utc).isoformat()

        # 5. Atomically update state in Azure Table Storage to 'done'
        entity = {
            "PartitionKey": pk,
            "RowKey": rk,
            "PK": raw_pk,
            "SK": raw_sk,
            "media_id": media_id,
            "user_id": user_id,
            "raw_s3_key": raw_s3_key,
            "status": "done",
            "thumbnail_s3_key": thumb_key,
            "updated_at": now,
            "width": meta.get("width"),
            "height": meta.get("height"),
            "aspect_ratio": meta.get("aspect_ratio"),
            "file_size_bytes": meta.get("file_size_bytes") or len(image_bytes),
            "format": meta.get("format", "JPEG"),
            "media_format": meta.get("format", "JPEG"),
            "has_transparency": meta.get("has_transparency", False),
            "GSI1PK": f"USER#{user_id}#STATUS#done",
            "GSI1SK": now,
        }

        if data.get("title"):
            entity["title"] = data.get("title")
        if data.get("content_type"):
            entity["content_type"] = data.get("content_type")

        # Embed EXIF camera details if available
        exif_dict = meta.get("exif")
        if exif_dict and isinstance(exif_dict, dict) and len(exif_dict) > 0:
            entity["exif"] = json.dumps(exif_dict)

        gps_dict = meta.get("gps")
        if gps_dict and isinstance(gps_dict, dict) and len(gps_dict) > 0:
            entity["gps"] = json.dumps(gps_dict)

        # Filter out any None values (Azure Tables disallow None property values)
        entity = {k: v for k, v in entity.items() if v is not None}

        table_client.upsert_entity(entity, mode=UpdateMode.MERGE)
        logging.info(f"✅ [SUCCESS] Successfully processed and marked 'done': media_id={media_id}")

    except Exception as exc:
        logging.exception(f"❌ [ERROR] Processing media_id={media_id}: {exc}")
        try:
            failed_entity = {
                "PartitionKey": pk,
                "RowKey": rk,
                "status": "failed",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            table_client.upsert_entity(failed_entity, mode=UpdateMode.MERGE)
        except Exception:
            pass
        raise
