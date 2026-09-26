# worker/metadata.py
import io
from PIL import Image, ImageOps

def extract_metadata(image_bytes: bytes) -> dict:
    with Image.open(io.BytesIO(image_bytes)) as img:
        original_format = img.format or "UNKNOWN"
        # Transpose according to EXIF orientation so width & height match visual reality
        transposed_img = ImageOps.exif_transpose(img)

        return {
            "width": transposed_img.width,
            "height": transposed_img.height,
            "format": original_format,
            "size_bytes": len(image_bytes)
        }