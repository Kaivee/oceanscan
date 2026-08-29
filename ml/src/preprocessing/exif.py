"""EXIF GPS geotag extraction for georeferenced sonar frames."""
from __future__ import annotations

import io

from PIL import Image
from PIL.ExifTags import GPSTAGS

GPS_IFD_TAG = 34853


def _component_to_float(component):
    """Resolve a DMS component that may be a (num, den) rational, an
    IFDRational/Fraction, or a plain float."""
    if isinstance(component, (tuple, list)):
        try:
            num, den = component[0], component[1]
            return num / den
        except (TypeError, IndexError, ZeroDivisionError):
            return None
    try:
        return float(component)
    except (TypeError, ValueError):
        return None


def _dms_to_decimal(value, ref: str):
    """Convert a DMS triple plus hemisphere ref to decimal degrees.

    Accepts both rational tuples ((num, den), ...) as produced by some
    readers and pre-collapsed floats (deg, min, sec) as produced by others.
    """
    try:
        deg = _component_to_float(value[0])
        mn = _component_to_float(value[1])
        sec = _component_to_float(value[2])
    except (TypeError, IndexError):
        return None
    if deg is None or mn is None or sec is None:
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
