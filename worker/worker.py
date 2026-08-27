# OWNER: Worker / Processing Developer
# TASK: Build the fault-tolerant background processor.
# FUNCTIONS TO CODE:
# 1. `poll_queue()`: Infinite loop checking SQS for messages.
# 2. `process_image()`: Download from S3, use Pillow to extract EXIF, and generate WebP thumbnail.
# 3. `update_database()`: Idempotent DynamoDB conditional update to mark status="done".
# 4. `delete_message()`: Remove task from SQS only if processing succeeds.
