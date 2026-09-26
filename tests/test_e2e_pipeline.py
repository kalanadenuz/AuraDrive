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