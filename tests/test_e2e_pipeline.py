import io
import time
import requests
import pytest
from PIL import Image

API_URL = "http://localhost:8000"

@pytest.fixture(scope="session")
def valid_image_bytes():
    file_obj = io.BytesIO()
    img = Image.new("RGB", (200, 200), color="blue")
    img.save(file_obj, format="PNG")
    return file_obj.getvalue()

def test_upload_endpoint(valid_image_bytes):
    files = {"file": ("sample.png", valid_image_bytes, "image/png")}
    data = {"title": "Unit Test Image"}
    res = requests.post(f"{API_URL}/upload", files=files, data=data)
    assert res.status_code == 202
    assert "media_id" in res.json()
    assert res.json()["status"] == "pending"