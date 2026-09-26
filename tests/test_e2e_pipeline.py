import io
import time
import requests
import pytest
from PIL import Image

API_URL = "http://localhost:8000"

@pytest.fixture(scope="session")
def valid_png_bytes():
    """Generates valid in-memory image bytes so processing doesn't crash."""
    buf = io.BytesIO()
    img = Image.new("RGB", (100, 100), color="blue")
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_upload_endpoint(valid_png_bytes):
    files = {"file": ("sample.png", valid_png_bytes, "image/png")}
    data = {"title": "Unit Test Image"}
    res = requests.post(f"{API_URL}/upload", files=files, data=data)
    assert res.status_code == 202
    assert "media_id" in res.json()
    assert res.json()["status"] == "pending"

def test_full_pipeline_e2e(valid_png_bytes):
    files = {"file": ("test.png", valid_png_bytes, "image/png")}
    res = requests.post(f"{API_URL}/upload", files=files, data={"title": "Test Pipeline"})
    assert res.status_code == 202
    media_id = res.json()["media_id"]

    processed = False
    for _ in range(12):
        time.sleep(1.5)
        resp = requests.get(f"{API_URL}/media/list")
        if resp.status_code == 200:
            gallery = resp.json()
            if any(item.get("media_id") == media_id for item in gallery.get("items", [])):
                processed = True
                break

    assert processed is True, f"Image {media_id} failed to transition to done in gallery."