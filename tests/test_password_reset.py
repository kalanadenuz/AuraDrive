from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from api.main import app
from api.services.aws_service import media_table

client = TestClient(app)


def test_password_reset_full_lifecycle():
    email = "lifecycle_user@auradrive.io"
    old_pw = "OldSecurePassword123!"
    new_pw = "NewSuperSecretPassword456!"
    known_code = "123456"

    # 1. Register test user
    reg_res = client.post("/api/auth/register", json={
        "email": email,
        "password": old_pw,
        "full_name": "Lifecycle Tester"
    })
    assert reg_res.status_code in [201, 400]

    # 2. Trigger forgot password with deterministic code
    with patch("api.main.secrets.randbelow", return_value=123456):
        forgot_res = client.post("/api/auth/forgot-password", json={"email": email})
    assert forgot_res.status_code == 200
    assert forgot_res.json()["email"] == email

    # 3. Retrieve the generated reset code from DynamoDB
    reset_item = media_table.get_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"}).get("Item")
    assert reset_item is not None
    assert "code_hash" in reset_item
    assert "expires_at" in reset_item
    assert reset_item["attempts"] == 0

    # 4. Test invalid verification code failure
    bad_verify = client.post("/api/auth/verify-reset-code", json={
        "email": email,
        "code": "000000"
    })
    assert bad_verify.status_code == 400
    assert "Invalid verification code" in bad_verify.json()["detail"]

    # Verify attempt count was incremented in DB
    updated_item = media_table.get_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"}).get("Item")
    assert updated_item["attempts"] == 1

    # 5. Verify valid code succeeds
    good_verify = client.post("/api/auth/verify-reset-code", json={
        "email": email,
        "code": known_code
    })
    assert good_verify.status_code == 200
    assert good_verify.json()["valid"] is True

    # 6. Complete password reset
    reset_res = client.post("/api/auth/reset-password", json={
        "email": email,
        "code": known_code,
        "new_password": new_pw
    })
    assert reset_res.status_code == 200

    # 7. Ensure reset code is deleted (single-use / replay prevention)
    consumed_item = media_table.get_item(Key={"PK": f"USER#{email}", "SK": "PASSWORD_RESET"}).get("Item")
    assert consumed_item is None

    # 8. Verify replaying the code fails
    replay_res = client.post("/api/auth/reset-password", json={
        "email": email,
        "code": known_code,
        "new_password": "ThirdPassword789!"
    })
    assert replay_res.status_code == 400

    # 9. Verify login with NEW password succeeds
    login_new = client.post("/api/auth/login", json={
        "email": email,
        "password": new_pw
    })
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()

    # 10. Verify login with OLD password fails
    login_old = client.post("/api/auth/login", json={
        "email": email,
        "password": old_pw
    })
    assert login_old.status_code == 401
