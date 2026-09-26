from fastapi import APIRouter, HTTPException, status
from api.services.aws_service import media_table

router = APIRouter()

@router.get("/media/list", status_code=status.HTTP_200_OK)
async def list_media():
    """Query DynamoDB GSI (StatusIndex) for all processed media items."""
    try:
        res = media_table.query(
            IndexName="StatusIndex",
            KeyConditionExpression="#st = :d",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={":d": "done"}
        )
        return {"items": res.get("Items", [])}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query gallery items: {str(e)}"
        )