import os
import sys
import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

# Add project root and api directory to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "api"))

try:
    from api.main import app, RAW_BUCKET_NAME
    from api.services.aws_service import media_table, s3_client
except ModuleNotFoundError:
    from main import app, RAW_BUCKET_NAME
    from services.aws_service import media_table, s3_client

client = TestClient(app)

def test_recycle_bin_and_share_e2e():
    """
    Validates complete lifecycle of Recycle Bin (7-day TTL, batch operations, empty trash),
    Storage Usage calculations, Public Sharing, and Media Downloads.
    """
    # 1. Register test user
    user_email = f"recycler_{uuid.uuid4().hex[:8]}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "email": user_email,
        "password": "Password123!",
        "full_name": "Recycle Tester"
    })
    assert reg_res.status_code == 201
    auth_token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["user_id"]
    headers = {"Authorization": f"Bearer {auth_token}"}

    # 2. Seed 2 media items directly into DynamoDB for this user
    now_iso = datetime.now(timezone.utc).isoformat()
    media_ids = [str(uuid.uuid4()), str(uuid.uuid4())]

    for idx, mid in enumerate(media_ids):
        raw_key = f"{user_id}/{mid}/photo_{idx}.jpg"
        # Seed dummy S3 object
        s3_client.put_object(
            Bucket=RAW_BUCKET_NAME,
            Key=raw_key,
            Body=b"sample image content",
            ContentType="image/jpeg",
        )
        media_table.put_item(Item={
            "PK": f"USER#{user_id}",
            "SK": f"MEDIA#{mid}",
            "media_id": mid,
            "user_id": user_id,
            "title": f"Test Photo {idx}",
            "status": "done",
            "raw_s3_key": raw_key,
            "file_size_bytes": 1024 * 1024 * 2, # 2 MB
            "format": "JPEG",
            "width": 1920,
            "height": 1080,
            "created_at": now_iso,
            "updated_at": now_iso,
            "is_trashed": False,
        })

    # 3. Test Storage Usage endpoint
    usage_res = client.get("/api/media/usage", headers=headers)
    assert usage_res.status_code == 200
    usage_data = usage_res.json()
    assert usage_data["active_bytes"] >= 4 * 1024 * 1024
    assert usage_data["trash_bytes"] == 0
    assert "used_percentage" in usage_data

    # 4. Active Gallery should contain both items
    gallery_res = client.get("/api/media/gallery", headers=headers)
    assert gallery_res.status_code == 200
    gallery_items = gallery_res.json()
    returned_ids = [m["media_id"] for m in gallery_items]
    assert media_ids[0] in returned_ids
    assert media_ids[1] in returned_ids

    # 5. Move single item to trash
    trash_res = client.post(f"/api/media/{media_ids[0]}/trash", headers=headers)
    assert trash_res.status_code == 200
    assert "recycle bin" in trash_res.json()["message"].lower()

    # Active gallery should now have only media_ids[1]
    gallery_res2 = client.get("/api/media/gallery", headers=headers)
    returned_ids2 = [m["media_id"] for m in gallery_res2.json()]
    assert media_ids[0] not in returned_ids2
    assert media_ids[1] in returned_ids2

    # Trash gallery should have media_ids[0] with days_remaining == 7
    trash_gallery = client.get("/api/media/trash", headers=headers)
    assert trash_gallery.status_code == 200
    trash_items = trash_gallery.json()
    assert any(m["media_id"] == media_ids[0] for m in trash_items)
    for m in trash_items:
        if m["media_id"] == media_ids[0]:
            assert m["days_remaining"] == 7

    # 6. Restore single item
    restore_res = client.post(f"/api/media/{media_ids[0]}/restore", headers=headers)
    assert restore_res.status_code == 200
    assert "restored" in restore_res.json()["message"].lower()

    # Both items should be back in active gallery
    gallery_res3 = client.get("/api/media/gallery", headers=headers)
    returned_ids3 = [m["media_id"] for m in gallery_res3.json()]
    assert media_ids[0] in returned_ids3
    assert media_ids[1] in returned_ids3

    # 7. Batch move both items to trash
    batch_trash_res = client.post("/api/media/trash/batch", json={"media_ids": media_ids}, headers=headers)
    assert batch_trash_res.status_code == 200
    assert len(batch_trash_res.json()["media_ids"]) == 2

    # Active gallery should be empty
    empty_gallery = client.get("/api/media/gallery", headers=headers)
    assert len(empty_gallery.json()) == 0

    # 8. Batch restore items
    batch_restore_res = client.post("/api/media/restore/batch", json={"media_ids": media_ids}, headers=headers)
    assert batch_restore_res.status_code == 200
    assert len(batch_restore_res.json()["media_ids"]) == 2

    # 9. Test Download presigned URL
    download_res = client.get(f"/api/media/{media_ids[0]}/download", headers=headers)
    assert download_res.status_code == 200
    download_data = download_res.json()
    assert "download_url" in download_data
    assert "response-content-disposition" in download_data["download_url"] or "photo_0" in download_data["download_url"]

    # 10. Test Public Share Link Creation & Unauthenticated Access
    share_create_res = client.post(f"/api/media/{media_ids[0]}/share", headers=headers)
    assert share_create_res.status_code == 200
    share_data = share_create_res.json()
    share_id = share_data["share_id"]
    assert "share_url" in share_data

    # Access shared media publicly without any Authorization header
    public_res = client.get(f"/api/public/share/{share_id}")
    assert public_res.status_code == 200
    pub_info = public_res.json()
    assert pub_info["title"] == "Test Photo 0"
    assert pub_info["owner_name"] == "Recycle Tester"
    assert "full_image_url" in pub_info or "download_url" in pub_info

    # 11. Empty Recycle Bin
    # Move media_ids[0] to trash again
    client.post(f"/api/media/{media_ids[0]}/trash", headers=headers)
    empty_trash_res = client.delete("/api/media/trash/empty", headers=headers)
    assert empty_trash_res.status_code == 200
    assert empty_trash_res.json()["purged_count"] >= 1

    # Verify trash is now empty
    post_empty_trash = client.get("/api/media/trash", headers=headers)
    assert len(post_empty_trash.json()) == 0
