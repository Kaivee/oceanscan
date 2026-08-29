from pathlib import Path
from io import BytesIO
from PIL import Image
from src.preprocessing.exif import get_gps_from_bytes, _dms_to_decimal


def _untagged_png_bytes() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (16, 16)).save(buf, format="PNG")
    return buf.getvalue()


def test_untagged_returns_none():
    data = _untagged_png_bytes()
    assert get_gps_from_bytes(data) is None


def test_real_untagged_aris3k_returns_none():
    p = Path("data/real_sonar/test/images/marine-debris-aris3k-834.png")
    assert get_gps_from_bytes(p.read_bytes()) is None


def test_dms_north_west():
    assert abs(_dms_to_decimal(((41, 1), (18, 1), (19, 1)), "N") - 41.30527777) < 1e-4
    assert abs(_dms_to_decimal(((70, 1), (33, 1), (24, 1)), "W") - -70.55666666) < 1e-4


def test_dms_south_east_negative_positive():
    assert abs(_dms_to_decimal(((10, 1), (0, 1), (0, 1)), "S") - -10.0) < 1e-9
    assert abs(_dms_to_decimal(((10, 1), (0, 1), (0, 1)), "E") - 10.0) < 1e-9


def test_dms_malformed_returns_none():
    assert _dms_to_decimal(((41, 0), (18, 1), (19, 1)), "N") is None  # div by zero
    assert _dms_to_decimal("garbage", "N") is None


def test_dms_float_triple():
    assert abs(_dms_to_decimal((41.0, 18.0, 19.0), "N") - 41.30527777) < 1e-4
    assert abs(_dms_to_decimal((70.0, 33.0, 22.32), "W") - -70.5562) < 1e-4


def test_geotagged_jpeg_returns_coords():
    p = Path("data/geotagged/marine-debris-aris3k-834_geotagged.jpg")
    if not p.exists():
        return
    gps = get_gps_from_bytes(p.read_bytes())
    assert gps is not None, "expected geotag from geotagged jpeg"
    assert abs(gps["latitude"] - 41.3081) < 1e-3
    assert abs(gps["longitude"] - -70.5562) < 1e-3


if __name__ == "__main__":
    test_untagged_returns_none()
    test_real_untagged_aris3k_returns_none()
    test_dms_north_west()
    test_dms_south_east_negative_positive()
    test_dms_malformed_returns_none()
    test_dms_float_triple()
    test_geotagged_jpeg_returns_coords()
    print("ALL EXIF TESTS PASSED")
