"""
Acoustic Image Preprocessing Pipeline
======================================
CLAHE enhancement, speckle noise reduction, and backscatter normalization
for side-scan sonar (SSS) imagery.
"""

from __future__ import annotations

import cv2
import numpy as np
from pathlib import Path

SUPPORTED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}


def load_sonar_image(path: str | Path) -> np.ndarray:
    """Load an image file and convert to single-channel grayscale.

    Parameters
    ----------
    path : str or Path
        Path to the image file.

    Returns
    -------
    np.ndarray
        Grayscale uint8 image (H, W).

    Raises
    ------
    FileNotFoundError
        If the path does not exist.
    ValueError
        If the file extension is unsupported or the image cannot be decoded.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported format '{path.suffix}'. "
            f"Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Failed to decode image: {path}")

    # Convert to grayscale if needed
    if img.ndim == 3:
        if img.shape[2] == 4:
            img = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
        else:
            img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Normalize to uint8 if stored as 16-bit
    if img.dtype == np.uint16:
        img = (img / 256).astype(np.uint8)
    elif img.dtype != np.uint8:
        img = cv2.normalize(img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    return img


def apply_clahe(
    image: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalization.

    Parameters
    ----------
    image : np.ndarray
        Grayscale uint8 image.
    clip_limit : float
        Threshold for contrast limiting. Higher values increase contrast.
    tile_grid_size : tuple[int, int]
        Size of the grid for local histogram equalization.

    Returns
    -------
    np.ndarray
        CLAHE-enhanced image.
    """
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    return clahe.apply(image)


def reduce_speckle(
    image: np.ndarray,
    method: str = "bilateral",
    *,
    bilateral_d: int = 9,
    bilateral_sigma_color: float = 75.0,
    bilateral_sigma_space: float = 75.0,
    median_kernel_size: int = 5,
) -> np.ndarray:
    """Reduce speckle noise using adaptive filtering.

    Parameters
    ----------
    image : np.ndarray
        Grayscale uint8 image.
    method : str
        'bilateral' for edge-preserving bilateral filter (preferred for sonar),
        'median' for adaptive median filtering.
    bilateral_d : int
        Diameter of each pixel neighbourhood for bilateral filter.
    bilateral_sigma_color : float
        Filter sigma in the color space (bilateral).
    bilateral_sigma_space : float
        Filter sigma in the coordinate space (bilateral).
    median_kernel_size : int
        Aperture size for median filter.

    Returns
    -------
    np.ndarray
        Speckle-reduced image.

    Raises
    ------
    ValueError
        If an unknown method is specified.
    """
    if method == "bilateral":
        return cv2.bilateralFilter(
            image,
            d=bilateral_d,
            sigmaColor=bilateral_sigma_color,
            sigmaSpace=bilateral_sigma_space,
        )
    elif method == "median":
        ksize = median_kernel_size if median_kernel_size % 2 == 1 else median_kernel_size + 1
        return cv2.medianBlur(image, ksize)
    else:
        raise ValueError(f"Unknown speckle reduction method: '{method}'. Use 'bilateral' or 'median'.")


def normalize_backscatter(image: np.ndarray) -> np.ndarray:
    """Normalize acoustic backscatter intensity to full dynamic range.

    Applies min-max normalization so the image spans 0-255,
    compensating for varying acoustic gain across swaths.

    Parameters
    ----------
    image : np.ndarray
        Grayscale uint8 image.

    Returns
    -------
    np.ndarray
        Normalized image.
    """
    normalized = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
    return normalized.astype(np.uint8)


def preprocess_pipeline(
    image: np.ndarray,
    *,
    clahe_enabled: bool = True,
    clip_limit: float = 2.0,
    tile_grid_size: tuple[int, int] = (8, 8),
    speckle_method: str = "bilateral",
    normalize: bool = True,
) -> np.ndarray:
    """Full preprocessing pipeline: CLAHE → speckle reduction → normalization.

    Parameters
    ----------
    image : np.ndarray
        Raw grayscale sonar image.
    clahe_enabled : bool
        Whether to apply CLAHE enhancement.
    clip_limit : float
        CLAHE clip limit.
    tile_grid_size : tuple[int, int]
        CLAHE tile grid size.
    speckle_method : str
        Speckle reduction method ('bilateral' or 'median').
    normalize : bool
        Whether to normalize backscatter at the end.

    Returns
    -------
    np.ndarray
        Processed image ready for model inference.
    """
    result = image.copy()

    if clahe_enabled:
        result = apply_clahe(result, clip_limit=clip_limit, tile_grid_size=tile_grid_size)

    result = reduce_speckle(result, method=speckle_method)

    if normalize:
        result = normalize_backscatter(result)

    return result
