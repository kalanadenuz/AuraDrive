import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add project root and api directory to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "api"))

try:
    from api.main import app
except ModuleNotFoundError:
    from main import app

client = TestClient(app)

# ----------------------------------------------------------------------
# 1. CORE SPRINT 02 REQUIREMENT: MULTI-TENANT ISOLATION
# ----------------------------------------------------------------------
def test_multi_tenant_isolation_flow():
    """
    Validates end-to-end multi-tenant isolation:
    - User A registers and uploads an asset.
    - User B cannot see User A's asset.
    - User A can see their own asset.
    """
    # 1. Register / Login User A
    user_a_email = "usera@example.com"
    res_a = client.post("/api/auth/register", json={
        "email": user_a_email,
        "password": "Password123!",
        "full_name": "User Alpha"
    })
    assert res_a.status_code in [201, 400]
    if res_a.status_code == 400:
        res_a = client.post("/api/auth/login", json={
            "email": user_a_email,
            "password": "Password123!"
        })
    token_a = res_a.json()["access_token"]

    # 2. Register / Login User B
    user_b_email = "userb@example.com"
    res_b = client.post("/api/auth/register", json={
        "email": user_b_email,
        "password": "Password123!",
        "full_name": "User Beta"
    })
    assert res_b.status_code in [201, 400]
    if res_b.status_code == 400:
        res_b = client.post("/api/auth/login", json={
            "email": user_b_email,
            "password": "Password123!"
        })
    token_b = res_b.json()["access_token"]

    # 3. User A uploads private media item
    file_payload = {
        "file": ("alpha_secret.png", b"\x89PNG\r\n\x1a\nfakeimagecontent", "image/png")
    }
    upload_res = client.post(
        "/api/media/upload",
        files=file_payload,
        data={"title": "Alpha Private Diagram"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert upload_res.status_code == 202
    media_id = upload_res.json()["media_id"]

    # 4. User B requests gallery: MUST NOT contain User A's media
    gallery_b = client.get(
        "/api/media/list",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert gallery_b.status_code == 200
    user_b_items = gallery_b.json()
    b_media_ids = [item["media_id"] for item in user_b_items]
    assert media_id not in b_media_ids, "CRITICAL SECURITY BREACH: User B can see User A's uploaded asset!"

    # 5. User A requests gallery: MUST contain the uploaded media
    gallery_a = client.get(
        "/api/media/list",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert gallery_a.status_code == 200
    a_media_ids = [item["media_id"] for item in gallery_a.json()]
    assert media_id in a_media_ids, "User A gallery failed to display own uploaded item."


# ----------------------------------------------------------------------
# 2. ENHANCEMENT: NEGATIVE SECURITY & ROUTE PROTECTION
# ----------------------------------------------------------------------
def test_unauthorized_endpoints_protection():
    """
    Negative Security Check:
    Verifies that requests without authentication headers are blocked.
    """
    res_list = client.get("/api/media/list")
    assert res_list.status_code in [401, 403], "Unauthenticated user bypassed route protection!"

    file_payload = {
        "file": ("unauthorized.png", b"\x89PNG\r\n\x1a\nfakeimagecontent", "image/png")
    }
    res_upload = client.post("/api/media/upload", files=file_payload, data={"title": "Unauthorized"})
    assert res_upload.status_code in [401, 403], "Unauthenticated upload was permitted!"


# ----------------------------------------------------------------------
# 3. ENHANCEMENT: CREDENTIAL VALIDATION
# ----------------------------------------------------------------------
def test_invalid_credentials_handling():
    """
    Negative Auth Check:
    Verifies that bad passwords receive HTTP 401.
    """
    res = client.post("/api/auth/login", json={
        "email": "usera@example.com",
        "password": "CompletelyWrongPassword!"
    })
    assert res.status_code == 401, "System allowed access with invalid credentials!"