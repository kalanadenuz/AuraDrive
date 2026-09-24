# worker/image_processor.py
import io
from PIL import Image

def create_thumbnail(image_bytes: bytes, max_size=(300, 300)) -> bytes:
    with Image.open(io.BytesIO(image_bytes)) as img:
        img = img.convert("RGB")
        img.thumbnail(max_size)
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80)
        return out.getvalue()