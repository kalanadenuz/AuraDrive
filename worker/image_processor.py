# worker/image_processor.py
import io
from PIL import Image, ImageOps
from PIL.ExifTags import TAGS


def extract_metadata(image_bytes: bytes) -> dict:
    """
    Extracts technical dimensions, format, color space, and human-readable EXIF tags.
    """
    metadata = {
        "width": None,
        "height": None,
        "format": None,
        "mode": None,
        "file_size_bytes": len(image_bytes),
        "exif": {}
    }

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format
            metadata["mode"] = img.mode

            # Extract EXIF if available
            raw_exif = img.getexif()
            if raw_exif:
                for tag_id, value in raw_exif.items():
                    tag_name = TAGS.get(tag_id, tag_id)
                    # Exclude raw binary blobs from EXIF dict
                    if isinstance(value, (bytes, bytearray)):
                        continue
                    # Convert un-serializable objects to string
                    try:
                        str_val = str(value).strip()
                        if str_val:
                            metadata["exif"][str(tag_name)] = str_val
                    except Exception:
                        pass
    except Exception as e:
        print(f"[WARN] Error reading image metadata: {e}")

    return metadata


def create_thumbnail(image_bytes: bytes, max_size=(300, 300)) -> bytes:
    """
    Normalizes rotation from EXIF and generates a lightweight WebP thumbnail.
    """
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