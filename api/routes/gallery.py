from fastapi import APIRouter
import boto3
from api.config import AWS_ENDPOINT_URL, AWS_REGION

router = APIRouter()

dynamodb = boto3.resource(
    "dynamodb",
    endpoint_url=AWS_ENDPOINT_URL,
    region_name=AWS_REGION
)
table = dynamodb.Table("AuraDrive_Media")

@router.get("/media/list")
def list_media():
    res = table.query(
        IndexName="StatusIndex",
        KeyConditionExpression="#st = :d",
        ExpressionAttributeNames={"#st": "status"},
        ExpressionAttributeValues={":d": "done"}
    )
    return {"items": res.get("Items", [])}