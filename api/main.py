import uuid

import boto3
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status


app = FastAPI(title="AuraDrive API")

s3_client = boto3.client(
	"s3",
	endpoint_url="http://localhost:4566",
	aws_access_key_id="test",
	aws_secret_access_key="test",
	region_name="us-east-1",
)

MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_file_size(file_bytes: bytes) -> None:
	if len(file_bytes) > MAX_FILE_SIZE:
		raise HTTPException(
			status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
			detail="File size exceeds the 10MB limit.",
		)


@app.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_media(file: UploadFile = File(...), title: str = Form(...)):
	contents = await file.read()
	validate_file_size(contents)

	media_id = str(uuid.uuid4())
	object_key = f"raw/{media_id}_{file.filename}"
	s3_client.put_object(
		Bucket="auradrive-raw",
		Key=object_key,
		Body=contents,
		ContentType=file.content_type,
	)

	return {
		"media_id": media_id,
		"title": title,
		"object_key": object_key,
		"status": "pending",
		"message": "File uploaded successfully to S3 storage.",
	}
# OWNER: API Developer
# TASK: Build the FastAPI REST server.
# FUNCTIONS TO CODE:
# 1. `upload_media()`: POST /upload. Accept multipart data, upload to S3, write "pending" to DB, push message to SQS, and return HTTP 202.
# 2. `list_media()`: GET /list. Fetch all records from DynamoDB.
# 3. `get_status()`: GET /status?id=... Fetch specific DB record.
# 4. `get_media()`: GET /media?id=... Generate S3 pre-signed URL.
#test comment
