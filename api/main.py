# OWNER: API Developer
# TASK: Build the FastAPI REST server.
# FUNCTIONS TO CODE:
# 1. `upload_media()`: POST /upload. Accept multipart data, upload to S3, write "pending" to DB, push message to SQS, and return HTTP 202.
# 2. `list_media()`: GET /list. Fetch all records from DynamoDB.
# 3. `get_status()`: GET /status?id=... Fetch specific DB record.
# 4. `get_media()`: GET /media?id=... Generate S3 pre-signed URL.
#test comment
import uuid
import json
from datetime import datetime, timezone

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status, Query
from fastapi.middleware.cors import CORSMiddleware
from api.config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB
from api.services.aws_service import QUEUE_URL, media_table, s3_client, sqs_client


app = FastAPI(title="AuraDrive API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def validate_uploaded_file(file: UploadFile, file_bytes: bytes) -> None:
	if file.content_type not in ALLOWED_EXTENSIONS:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Invalid file type.",
		)
	if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
		raise HTTPException(
			status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
			detail="File size exceeds 10 MB.",
		)


@app.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_media(file: UploadFile = File(...), title: str = Form(...)):
	contents = await file.read()
	validate_uploaded_file(file, contents)

	media_id = str(uuid.uuid4())
	raw_s3_key = f"raw/{media_id}_{file.filename}"
	s3_client.put_object(
		Bucket="auradrive-raw",
		Key=raw_s3_key,
		Body=contents,
		ContentType=file.content_type,
	)

	timestamp = datetime.now(timezone.utc).isoformat()
	db_item = {
		"media_id": media_id,
		"title": title,
		"raw_s3_key": raw_s3_key,
		"status": "pending",
		"created_at": timestamp,
	}
	media_table.put_item(Item=db_item)

	payload = {"media_id": media_id, "raw_s3_key": raw_s3_key}
	sqs_client.send_message(
		QueueUrl=QUEUE_URL,
		MessageBody=json.dumps(payload),
	)

	return {
		"media_id": media_id,
		"status": "pending",
		"message": "File received and queued for processing.",
	}

