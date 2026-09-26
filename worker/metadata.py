import io
from PIL import Image

def extract_metadata(image_bytes: bytes) -> dict:
    with Image.open(io.BytesIO(image_bytes)) as img:
        return {
            "width": img.width,
            "height": img.height,
            "format": img.format
        }