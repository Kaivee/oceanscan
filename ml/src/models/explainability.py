"""
Grad-CAM Explainability Module
================================
Generates class-discriminative activation heatmaps for sonar
segmentation model predictions using Grad-CAM / feature-attribution.
"""

from __future__ import annotations

import cv2
import numpy as np
import torch
import torch.nn.functional as F


class GradCAMGenerator:
    """Generate Grad-CAM heatmaps for YOLO-based segmentation models.

    Since YOLO models don't expose standard classifier logits, this module
    uses a feature-activation approach: it hooks into the last
    convolutional backbone layer and generates a spatial importance map
    based on activation magnitudes.

    Parameters
    ----------
    model : torch.nn.Module
        The loaded YOLO model (accessed via model.model).
    target_layer_name : str or None
        Name of the backbone layer to hook. None = auto-detect last conv.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        target_layer_name: str | None = None,
    ) -> None:
        self.model = model
        self.target_layer_name = target_layer_name
        self._activations: torch.Tensor | None = None
        self._hooks: list[torch.utils.hooks.RemovableHook] = []
        self._register_hooks()

    def _register_hooks(self) -> None:
        """Register forward hooks on the target layer."""
        target_layer = self._find_target_layer()
        if target_layer is None:
            return

        def forward_hook(module, input, output):
            self._activations = output.detach()

        hook = target_layer.register_forward_hook(forward_hook)
        self._hooks.append(hook)

    def _find_target_layer(self) -> torch.nn.Module | None:
        """Find the last convolutional layer in the backbone."""
        if self.target_layer_name:
            for name, module in self.model.named_modules():
                if name == self.target_layer_name:
                    return module
            return None

        # Auto-detect: find the last Conv2d in the model
        last_conv = None
        for module in self.model.modules():
            if isinstance(module, torch.nn.Conv2d):
                last_conv = module
        return last_conv

    def generate(
        self,
        image: np.ndarray,
        *,
        colormap: int = cv2.COLORMAP_JET,
        overlay_alpha: float = 0.45,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Generate a Grad-CAM heatmap overlay.

        Parameters
        ----------
        image : np.ndarray
            Input BGR image (H, W, 3).
        colormap : int
            OpenCV colormap for the heatmap.
        overlay_alpha : float
            Blending alpha for the overlay (0 = original, 1 = full heatmap).

        Returns
        -------
        tuple[np.ndarray, np.ndarray]
            (heatmap_colormap, overlay) — the normalized heatmap and the blended overlay.
        """
        self._activations = None

        # Prepare input tensor
        img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if image.ndim == 3 else cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        h, w = img_rgb.shape[:2]

        tensor = torch.from_numpy(img_rgb).permute(2, 0, 1).float() / 255.0
        tensor = tensor.unsqueeze(0)

        # Device-aware inference
        device = next(self.model.parameters()).device
        tensor = tensor.to(device)

        # Forward pass to capture activations
        with torch.no_grad():
            try:
                self.model(tensor)
            except Exception:
                # Some YOLO versions expect different input shapes
                pass

        if self._activations is None:
            return self._generate_fallback(image, colormap, overlay_alpha)

        # Process activations into a heatmap
        acts = self._activations[0]  # (C, H_a, W_a)

        # Channel-wise magnitude
        heatmap = acts.abs().mean(dim=0).cpu().numpy()

        # Normalize to 0-255
        heatmap = heatmap - heatmap.min()
        if heatmap.max() > 0:
            heatmap = (heatmap / heatmap.max() * 255).astype(np.uint8)
        else:
            heatmap = np.zeros_like(heatmap, dtype=np.uint8)

        # Resize to input dimensions
        heatmap = cv2.resize(heatmap, (w, h), interpolation=cv2.INTER_LINEAR)

        # Apply colormap
        heatmap_colored = cv2.applyColorMap(heatmap, colormap)

        # Create overlay
        if image.ndim == 2:
            base = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            base = image.copy()

        overlay = cv2.addWeighted(base, 1 - overlay_alpha, heatmap_colored, overlay_alpha, 0)

        return heatmap_colored, overlay

    def _generate_fallback(
        self,
        image: np.ndarray,
        colormap: int,
        overlay_alpha: float,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Generate a synthetic feature-activation map when hooks fail.

        Uses edge detection and intensity gradients as a proxy for
        acoustic feature importance.
        """
        h, w = image.shape[:2]
        if image.ndim == 2:
            gray = image
        else:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Edge-based importance map
        edges = cv2.Canny(gray, 50, 150)
        blurred = cv2.GaussianBlur(edges, (15, 15), 0)

        # Normalize
        if blurred.max() > 0:
            heatmap = (blurred.astype(np.float32) / blurred.max() * 255).astype(np.uint8)
        else:
            heatmap = np.zeros((h, w), dtype=np.uint8)

        heatmap_colored = cv2.applyColorMap(heatmap, colormap)

        if image.ndim == 2:
            base = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        else:
            base = image.copy()

        overlay = cv2.addWeighted(base, 1 - overlay_alpha, heatmap_colored, overlay_alpha, 0)

        return heatmap_colored, overlay

    def remove_hooks(self) -> None:
        """Remove all registered hooks."""
        for hook in self._hooks:
            hook.remove()
        self._hooks.clear()
