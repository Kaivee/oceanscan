"""EXIF GPS geotag extraction for georeferenced sonar frames."""
from __future__ import annotations

import io

from PIL import Image
from PIL.ExifTags import GPSTAGS

GPS_IFD_TAG = 34853


def _dms_to_decimal(value, ref: str):
    """Convert a DMS rational tuple plus hemisphere ref to decimal degrees."""
    try:
        deg = value[0][0] / value[0][1]
        mn = value[1][0] / value[1][1]
        sec = value[2][0] / value[2][1]
    except (TypeError, IndexError, ZeroDivisionError):
        return None
    decimal = deg + mn / 60 + sec / 3600
    return -decimal if ref in ("S", "W") else decimal


def get_gps_from_bytes(data: bytes):
    """Extract {latitude, longitude} from image EXIF GPS, or None.

    Returns None for untagged images, missing GPS, malformed values, or
    out-of-range coordinates (lat not in [-90,90], lon not in [-180,180]).
    """
    try:
        image = Image.open(io.BytesIO(data))
        exif = image.getexif()
        if not exif or GPS_IFD_TAG not in exif:
            return None
        gps = exif.get_ifd(GPS_IFD_TAG)
        lat_ref = gps.get(1)
        lat_val = gps.get(2)
        lon_ref = gps.get(3)
        lon_val = gps.get(4)
        if lat_ref is None or lon_ref is None or lat_val is None or lon_val is None:
            return None
        lat = _dms_to_decimal(lat_val, lat_ref)
        lon = _dms_to_decimal(lon_val, lon_ref)
        if lat is None or lon is None:
            return None
        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            return None
        return {"latitude": round(lat, 6), "longitude": round(lon, 6)}
    except Exception:
        return None
