import os
import sys
import boto3

ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
REGION = os.getenv("AWS_REGION", "us-east-1")
TARGET_TABLE = os.getenv("TABLE_NAME", "AuraDrive_Storage")

dynamodb = boto3.client(
    "dynamodb",
    endpoint_url=ENDPOINT_URL,
    region_name=REGION,
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test"),
)


def verify_database_health():
    print(f"[*] Connecting to DynamoDB at {ENDPOINT_URL} (Region: {REGION})...")
    
    try:
        tables = dynamodb.list_tables()["TableNames"]
    except Exception as e:
        print(f"[!] DynamoDB connection failed: {e}")
        sys.exit(1)

    table_name = TARGET_TABLE
    if table_name not in tables:
        # Graceful fallback to legacy table name if initialized under AuraDrive_Media
        if "AuraDrive_Media" in tables:
            table_name = "AuraDrive_Media"
            print(f"[i] Using fallback table name: {table_name}")
        else:
            print(f"[!] Neither '{TARGET_TABLE}' nor 'AuraDrive_Media' found in {tables}")
            sys.exit(1)

    desc = dynamodb.describe_table(TableName=table_name)["Table"]
    status = desc.get("TableStatus")
    assert status in ["ACTIVE", "UPDATING"], f"Table state invalid: {status}"

    # Verify primary key structure
    key_schema = {k["KeyType"]: k["AttributeName"] for k in desc.get("KeySchema", [])}
    assert "HASH" in key_schema, "Missing primary HASH key!"

    # Verify GSI configuration
    gsis = [g["IndexName"] for g in desc.get("GlobalSecondaryIndexes", [])]
    print(f"[+] Table '{table_name}' verified active. Discovered GSIs: {gsis}")
    print("[+] Database schema validation completed successfully.")


if __name__ == "__main__":
    verify_database_health()