import os
import boto3

ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = os.getenv("AWS_REGION", "us-east-1")

dynamodb = boto3.client(
    "dynamodb",
    endpoint_url=ENDPOINT_URL,
    region_name=REGION,
    aws_access_key_id="test",
    aws_secret_access_key="test"
)

def verify_database_health():
    tables = dynamodb.list_tables()["TableNames"]
    assert "AuraDrive_Storage" in tables, "Table AuraDrive_Storage missing!"
    desc = dynamodb.describe_table(TableName="AuraDrive_Storage")["Table"]
    assert desc["TableStatus"] in ["ACTIVE", "UPDATING"]
    gsis = [g["IndexName"] for g in desc.get("GlobalSecondaryIndexes", [])]
    assert "GSI1" in gsis, "GSI1 index missing from AuraDrive_Storage!"
    print("Database schema confirmed active with multi-tenant index.")

if __name__ == "__main__":
    verify_database_health()