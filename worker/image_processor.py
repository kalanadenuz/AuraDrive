# worker/image_processor.py
import io
from PIL import Image, ImageOps

def create_thumbnail(image_bytes: bytes, max_size=(300, 300)) -> bytes:
    with Image.open(io.BytesIO(image_bytes)) as img:
        # Correct rotation based on EXIF metadata (crucial for phone camera uploads)
        img = ImageOps.exif_transpose(img)

        # Preserve transparency for RGBA/LA/P palettes, otherwise convert to standard RGB
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")

        # In-place proportional resize
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

        out = io.BytesIO()
        img.save(out, format="WEBP", quality=80, method=6)
        return out.getvalue()