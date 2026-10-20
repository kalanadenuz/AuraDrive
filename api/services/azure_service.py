# api/services/azure_service.py
"""
Azure Cloud Native Service Adapter for AuraDrive.
Provides seamless drop-in replacements for AWS S3, SQS, and DynamoDB
using Azure Blob Storage, Azure Queue Storage, and Azure Table Storage
under a single Azure Storage Account (Standard_LRS / Free Tier).
"""
import io
import json
import logging
import os
from datetime import datetime, timedelta, timezone

logger = logging.getLogger("AuraDriveAzureService")


def _get_connection_string() -> str:
    conn = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "").strip()
    if not conn:
        raise ValueError(
            "AZURE_STORAGE_CONNECTION_STRING environment variable is not configured. "
            "Please provide a valid Azure Storage Account connection string."
        )
    return conn


def _parse_account_info(connection_string: str) -> tuple[str, str]:
    parts = dict(
        part.split("=", 1)
        for part in connection_string.split(";")
        if "=" in part
    )
    account_name = parts.get("AccountName", "")
    account_key = parts.get("AccountKey", "")
    return account_name, account_key


class AzureBlobClient:
    """Drop-in adapter for boto3 s3_client."""

    def __init__(self, connection_string: str):
        from azure.storage.blob import BlobServiceClient
        self.blob_service = BlobServiceClient.from_connection_string(connection_string)
        self.account_name, self.account_key = _parse_account_info(connection_string)
        self._ensured_containers = set()

    def _ensure_container(self, container_name: str):
        if container_name not in self._ensured_containers:
            try:
                container_client = self.blob_service.get_container_client(container_name)
                if not container_client.exists():
                    container_client.create_container()
                self._ensured_containers.add(container_name)
            except Exception as e:
                logger.warning(f"Container check for '{container_name}': {e}")

    def put_object(self, Bucket: str, Key: str, Body: bytes | io.IOBase, ContentType: str | None = None, **kwargs):
        from azure.storage.blob import ContentSettings
        self._ensure_container(Bucket)
        blob_client = self.blob_service.get_blob_client(container=Bucket, blob=Key)
        content_settings = ContentSettings(content_type=ContentType) if ContentType else None
        return blob_client.upload_blob(Body, overwrite=True, content_settings=content_settings)

    def upload_fileobj(self, Fileobj, Bucket: str, Key: str, ExtraArgs: dict | None = None, **kwargs):
        from azure.storage.blob import ContentSettings
        self._ensure_container(Bucket)
        content_type = ExtraArgs.get("ContentType") if ExtraArgs else None
        content_settings = ContentSettings(content_type=content_type) if content_type else None
        blob_client = self.blob_service.get_blob_client(container=Bucket, blob=Key)
        return blob_client.upload_blob(Fileobj, overwrite=True, content_settings=content_settings)

    def get_object(self, Bucket: str, Key: str, **kwargs) -> dict:
        blob_client = self.blob_service.get_blob_client(container=Bucket, blob=Key)
        stream = blob_client.download_blob()
        data = stream.readall()
        return {"Body": io.BytesIO(data), "ContentLength": len(data)}

    def delete_object(self, Bucket: str, Key: str, **kwargs):
        try:
            blob_client = self.blob_service.get_blob_client(container=Bucket, blob=Key)
            blob_client.delete_blob()
        except Exception as e:
            logger.debug(f"Azure blob delete error for {Bucket}/{Key}: {e}")

    def generate_presigned_url(self, ClientMethod: str, Params: dict, ExpiresIn: int = 3600) -> str:
        from azure.storage.blob import generate_blob_sas, BlobSasPermissions
        bucket = Params.get("Bucket", "")
        key = Params.get("Key", "")
        content_disposition = Params.get("ResponseContentDisposition")

        now = datetime.now(timezone.utc)
        expiry = now + timedelta(seconds=ExpiresIn)

        sas_token = generate_blob_sas(
            account_name=self.account_name,
            container_name=bucket,
            blob_name=key,
            account_key=self.account_key,
            permission=BlobSasPermissions(read=True),
            expiry=expiry,
            content_disposition=content_disposition,
        )

        return f"https://{self.account_name}.blob.core.windows.net/{bucket}/{key}?{sas_token}"


class AzureQueueClient:
    """Drop-in adapter for boto3 sqs_client."""

    def __init__(self, connection_string: str, default_queue_name: str = "auradrive-queue"):
        from azure.storage.queue import QueueServiceClient
        self.queue_service = QueueServiceClient.from_connection_string(connection_string)
        self.default_queue_name = default_queue_name
        self._ensure_queue(default_queue_name)

    def _ensure_queue(self, queue_name: str):
        try:
            client = self.queue_service.get_queue_client(queue_name)
            client.create_queue()
        except Exception:
            pass

    def send_message(self, QueueUrl: str | None = None, MessageBody: str = "", **kwargs) -> dict:
        queue_name = self.default_queue_name
        client = self.queue_service.get_queue_client(queue_name)
        msg = client.send_message(MessageBody)
        return {"MessageId": msg.id}

    def receive_message(self, QueueUrl: str | None = None, MaxNumberOfMessages: int = 1, WaitTimeSeconds: int = 20, **kwargs) -> dict:
        queue_name = self.default_queue_name
        client = self.queue_service.get_queue_client(queue_name)
        messages = client.receive_messages(
            messages_per_page=MaxNumberOfMessages,
            visibility_timeout=60,
        )
        results = []
        for m in messages:
            results.append({
                "MessageId": m.id,
                "ReceiptHandle": f"{m.id}:{m.pop_receipt}",
                "Body": m.content,
                "_raw_msg": m,
            })
        return {"Messages": results}

    def receive_messages(self, QueueUrl: str | None = None, MaxNumberOfMessages: int = 1, WaitTimeSeconds: int = 20, **kwargs) -> list:
        return self.receive_message(QueueUrl, MaxNumberOfMessages, WaitTimeSeconds).get("Messages", [])

    def delete_message(self, QueueUrl: str | None = None, ReceiptHandle: str = "", **kwargs):
        queue_name = self.default_queue_name
        client = self.queue_service.get_queue_client(queue_name)
        # SQS passes ReceiptHandle. In Azure Queue, delete_message takes (message_id, pop_receipt)
        # or message object. ReceiptHandle holds the pop_receipt string or ID:receipt
        if ":" in ReceiptHandle:
            msg_id, pop_receipt = ReceiptHandle.split(":", 1)
            client.delete_message(msg_id, pop_receipt)
        else:
            client.delete_message(ReceiptHandle, ReceiptHandle)


def _sanitize_key(key: str) -> str:
    r"""Azure Table Storage strictly disallows: / \ # ? and control chars in PartitionKey and RowKey."""
    return (
        str(key)
        .replace("#", "___HASH___")
        .replace("/", "___SLASH___")
        .replace("\\", "___BSLASH___")
        .replace("?", "___QMARK___")
    )


def _unsanitize_key(key: str) -> str:
    return (
        str(key)
        .replace("___HASH___", "#")
        .replace("___SLASH___", "/")
        .replace("___BSLASH___", "\\")
        .replace("___QMARK___", "?")
    )


class AzureTable:
    """Drop-in adapter for boto3 DynamoDB Table resource."""

    def __init__(self, connection_string: str, table_name: str = "AuraDriveStorage"):
        from azure.data.tables import TableServiceClient
        self.service = TableServiceClient.from_connection_string(connection_string)
        self.table_name = table_name
        try:
            self.service.create_table(table_name)
        except Exception:
            pass
        self.table_client = self.service.get_table_client(table_name)

    def _to_entity(self, item: dict) -> dict:
        entity = {}
        for k, v in item.items():
            if isinstance(v, (dict, list)):
                entity[k] = json.dumps(v)
            else:
                entity[k] = v
        # Ensure PartitionKey and RowKey exist and are safe from disallowed characters (/ \ # ?)
        raw_pk = str(item.get("PK", ""))
        raw_sk = str(item.get("SK", ""))
        entity["PartitionKey"] = _sanitize_key(raw_pk)
        entity["RowKey"] = _sanitize_key(raw_sk)
        entity["PK"] = raw_pk
        entity["SK"] = raw_sk
        return entity

    def _from_entity(self, entity: dict) -> dict:
        item = dict(entity)
        # Restore PK and SK from PartitionKey/RowKey if missing
        if "PK" not in item and "PartitionKey" in item:
            item["PK"] = _unsanitize_key(item["PartitionKey"])
        if "SK" not in item and "RowKey" in item:
            item["SK"] = _unsanitize_key(item["RowKey"])

        # Parse nested json strings
        for k, v in item.items():
            if isinstance(v, str) and ((v.startswith("{") and v.endswith("}")) or (v.startswith("[") and v.endswith("]"))):
                try:
                    item[k] = json.loads(v)
                except Exception:
                    pass
        return item

    def put_item(self, Item: dict, **kwargs) -> dict:
        from azure.data.tables import UpdateMode
        entity = self._to_entity(Item)
        self.table_client.upsert_entity(entity, mode=UpdateMode.REPLACE)
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def get_item(self, Key: dict, **kwargs) -> dict:
        from azure.core.exceptions import ResourceNotFoundError
        pk = _sanitize_key(Key.get("PK", ""))
        sk = _sanitize_key(Key.get("SK", ""))
        try:
            entity = self.table_client.get_entity(partition_key=pk, row_key=sk)
            return {"Item": self._from_entity(entity)}
        except ResourceNotFoundError:
            return {}
        except Exception as e:
            logger.warning(f"Azure table get_entity failed for {pk}/{sk}: {e}")
            return {}

    def delete_item(self, Key: dict, **kwargs) -> dict:
        from azure.core.exceptions import ResourceNotFoundError
        pk = _sanitize_key(Key.get("PK", ""))
        sk = _sanitize_key(Key.get("SK", ""))
        try:
            self.table_client.delete_entity(partition_key=pk, row_key=sk)
        except ResourceNotFoundError:
            pass
        return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    def update_item(
        self,
        Key: dict,
        UpdateExpression: str = "",
        ExpressionAttributeNames: dict | None = None,
        ExpressionAttributeValues: dict | None = None,
        **kwargs,
    ) -> dict:
        from azure.data.tables import UpdateMode
        from azure.core.exceptions import ResourceNotFoundError

        names = ExpressionAttributeNames or {}
        values = ExpressionAttributeValues or {}

        raw_pk = str(Key.get("PK", ""))
        raw_sk = str(Key.get("SK", ""))
        pk = _sanitize_key(raw_pk)
        sk = _sanitize_key(raw_sk)

        try:
            entity = dict(self.table_client.get_entity(partition_key=pk, row_key=sk))
        except ResourceNotFoundError:
            entity = {"PartitionKey": pk, "RowKey": sk, "PK": raw_pk, "SK": raw_sk}

        # Handle REMOVE clause
        has_remove = False
        if "REMOVE " in UpdateExpression:
            has_remove = True
            parts = UpdateExpression.split("REMOVE ", 1)[1]
            remove_part = parts.split("SET ", 1)[0] if "SET " in parts else parts
            for item in remove_part.split(","):
                field = item.strip()
                field = names.get(field, field)
                entity.pop(field, None)
                if field == "is_trashed":
                    entity["is_trashed"] = False

        # Handle SET clause
        if "SET " in UpdateExpression:
            set_part = UpdateExpression.split("SET ", 1)[1]
            set_part = set_part.split("REMOVE ", 1)[0]
            for assign in set_part.split(","):
                if "=" in assign:
                    left, right = assign.split("=", 1)
                    left = left.strip()
                    right = right.strip()
                    field = names.get(left, left)
                    val = values.get(right)
                    if isinstance(val, (dict, list)):
                        val = json.dumps(val)
                    entity[field] = val

        entity["PartitionKey"] = pk
        entity["RowKey"] = sk
        entity["PK"] = raw_pk
        entity["SK"] = raw_sk

        # Filter out None values for Azure Tables
        entity = {k: v for k, v in entity.items() if v is not None}

        # Use REPLACE when removing properties so Azure Tables actually removes them
        mode = UpdateMode.REPLACE if has_remove else UpdateMode.MERGE
        self.table_client.upsert_entity(entity, mode=mode)
        return {"Attributes": self._from_entity(entity)}

    def query(self, KeyConditionExpression=None, **kwargs) -> dict:
        """Translates boto3 DynamoDB KeyConditionExpression to Azure Table OData filter."""
        pk_val = None
        sk_prefix = None

        if KeyConditionExpression is not None:
            # Check if it's a boto3 condition object
            values = getattr(KeyConditionExpression, "_values", None)
            if values:
                for cond in values:
                    cond_vals = getattr(cond, "_values", None)
                    if cond_vals and len(cond_vals) >= 2:
                        col_obj = cond_vals[0]
                        col_name = getattr(col_obj, "name", str(col_obj))
                        val = cond_vals[1]

                        if col_name == "PK":
                            pk_val = val
                        elif col_name == "SK":
                            sk_prefix = val
            elif hasattr(KeyConditionExpression, "get_expression"):
                # Single condition
                cond_vals = getattr(KeyConditionExpression, "_values", None)
                if cond_vals and len(cond_vals) >= 2:
                    col_name = getattr(cond_vals[0], "name", str(cond_vals[0]))
                    if col_name == "PK":
                        pk_val = cond_vals[1]

        filters = []
        if pk_val:
            sanitized_pk = _sanitize_key(pk_val)
            filters.append(f"PartitionKey eq '{sanitized_pk}'")
        if sk_prefix:
            sanitized_sk = _sanitize_key(sk_prefix)
            next_char = chr(ord(sanitized_sk[-1]) + 1)
            high_prefix = sanitized_sk[:-1] + next_char
            filters.append(f"RowKey ge '{sanitized_sk}' and RowKey lt '{high_prefix}'")

        filter_expr = " and ".join(filters) if filters else None

        items = []
        try:
            entities = self.table_client.query_entities(query_filter=filter_expr)
            for e in entities:
                items.append(self._from_entity(e))
        except Exception as e:
            logger.warning(f"Azure table query error: {e}")

        return {"Items": items}

        return {"Items": items}
