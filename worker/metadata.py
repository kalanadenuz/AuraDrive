# worker/metadata.py
import io
import math
from typing import Any, Dict
from PIL import Image, ImageOps
from PIL.ExifTags import GPSTAGS, IFD, TAGS


def _sanitize_for_dynamodb(val: Any) -> Any:
    """Recursively formats and strips non-serializable binary and complex types."""
    if isinstance(val, (bytes, bytearray)):
        return None
    if isinstance(val, (int, str, bool)):
        return val
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
        return round(val, 4)
    if isinstance(val, (list, tuple)):
        cleaned = [_sanitize_for_dynamodb(x) for x in val]
        return [x for x in cleaned if x is not None]
    if isinstance(val, dict):
        cleaned_dict = {}
        for k, v in val.items():
            cleaned_val = _sanitize_for_dynamodb(v)
            if cleaned_val is not None:
                cleaned_dict[str(k)] = cleaned_val
        return cleaned_dict
    # Fallback to string representation for IFDRational and custom Pillow structures
    try:
        s = str(val).strip()
        return s if s else None
    except Exception:
        return None


def extract_metadata(image_bytes: bytes) -> Dict[str, Any]:
    """
    Extracts all possible visual, structural, and technical EXIF/GPS metadata
    from an image byte stream.
    """
    if not image_bytes:
        return {
            "width": None,
            "height": None,
            "format": "UNKNOWN",
            "file_size_bytes": 0,
            "exif": {},
        }

    meta: Dict[str, Any] = {
        "file_size_bytes": len(image_bytes),
        "width": None,
        "height": None,
        "format": "UNKNOWN",
        "mode": "UNKNOWN",
        "aspect_ratio": None,
        "has_transparency": False,
        "exif": {},
        "gps": {},
    }

    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            meta["format"] = img.format or "UNKNOWN"
            meta["mode"] = img.mode

            # Transparency checks
            meta["has_transparency"] = (
                img.mode in ("RGBA", "LA")
                or (img.mode == "P" and "transparency" in img.info)
            )

            # Transpose orientation so dimensions correspond to actual viewing angle
            transposed_img = ImageOps.exif_transpose(img)
            width, height = transposed_img.size if transposed_img else img.size

            meta["width"] = int(width)
            meta["height"] = int(height)

            if width and height:
                gcd_val = math.gcd(width, height)
                meta["aspect_ratio"] = f"{width // gcd_val}:{height // gcd_val}"

            # 1. Primary EXIF parsing
            raw_exif = img.getexif()
            if raw_exif:
                for tag_id, value in raw_exif.items():
                    tag_name = TAGS.get(tag_id, str(tag_id))
                    cleaned = _sanitize_for_dynamodb(value)
                    if cleaned is not None:
                        meta["exif"][str(tag_name)] = cleaned

                # 2. Nested IFD Sub-Trees (Camera parameters, exposure, lens details)
                try:
                    for ifd_id in (IFD.Exif, IFD.Interop):
                        ifd_data = raw_exif.get_ifd(ifd_id)
                        for tag_id, value in ifd_data.items():
                            tag_name = TAGS.get(tag_id, str(tag_id))
                            cleaned = _sanitize_for_dynamodb(value)
                            if cleaned is not None:
                                meta["exif"][str(tag_name)] = cleaned
                except Exception:
                    pass

                # 3. GPS Sub-Tree
                try:
                    gps_data = raw_exif.get_ifd(IFD.GPSInfo)
                    for tag_id, value in gps_data.items():
                        tag_name = GPSTAGS.get(tag_id, str(tag_id))
                        cleaned = _sanitize_for_dynamodb(value)
                        if cleaned is not None:
                            meta["gps"][str(tag_name)] = cleaned
                except Exception:
                    pass

    except Exception as exc:
        print(f"[WARN] Error during deep metadata extraction: {exc}")

    return meta