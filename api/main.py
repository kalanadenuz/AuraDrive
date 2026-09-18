# OWNER: API Developer
# TASK: Build the FastAPI REST server.
# FUNCTIONS TO CODE:
# 1. `upload_media()`: POST /upload. Accept multipart data, upload to S3, write "pending" to DB, push message to SQS, and return HTTP 202.
# 2. `list_media()`: GET /list. Fetch all records from DynamoDB.
# 3. `get_status()`: GET /status?id=... Fetch specific DB record.
# 4. `get_media()`: GET /media?id=... Generate S3 pre-signed URL.
#test comment