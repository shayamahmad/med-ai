# ================================================================
# gradcam.py — FIXED VERSION
# All 7 bugs corrected (see comments marked with # FIX)
# ================================================================

import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image
from image_utils import image_to_base64   # FIX 1: removed pil_to_based (doesn't exist)


class GradCAM:
    """
    Grad-CAM implementation for CNN explainability.
    Hooks into the last convolutional layer and computes
    gradient-weighted activation maps.
    """

    # FIX 3: __init__ and all methods are at correct class indentation level
    def __init__(self, model: nn.Module, model_arch: str = "resnet50"):
        self.model       = model
        self.model_arch  = model_arch
        self.gradients   = None
        self.activations = None
        self._hooks      = []

        target_layer = self._get_target_layer()   # FIX 2: was _find_target_layer (doesn't exist)
        h1 = target_layer.register_forward_hook(self._save_activation)
        h2 = target_layer.register_full_backward_hook(self._save_gradient)
        self._hooks.extend([h1, h2])

    def _get_target_layer(self) -> nn.Module:
        """Get the last conv layer based on architecture."""
        if self.model_arch == "resnet50":
            return self.model.layer4[-1].conv3
        elif self.model_arch == "efficientnet":
            return self.model.conv_head
        elif self.model_arch == "densenet":
            target = self.model.base if hasattr(self.model, "base") else self.model
            return target.features.denseblock4.denselayer16.conv2
        else:
            return self.model.layer4[-1].conv3

    def _save_activation(self, module, input, output):
        self.activations = output.detach()

    def _save_gradient(self, module, grad_input, grad_output):   # FIX 5: was save_gradient (missing underscore)
        self.gradients = grad_output[0].detach()

    def generate(
        self,
        input_tensor : torch.Tensor,
        class_idx    : int = None,
        img_size     : tuple = (224, 224)   # FIX 6: was "img_size = tuple = (224,224)" (syntax error)
    ) -> tuple:
        """
        Generate Grad-CAM heatmap.

        Args:
            input_tensor: preprocessed image tensor [1, 3, H, W]
            class_idx   : target class (None = predicted class)
            img_size    : output heatmap size

        Returns:
            heatmap   : colored heatmap as numpy array [H, W, 3] BGR
            class_idx : predicted/target class index
            probs     : softmax probabilities for all classes
        """
        self.model.eval()
        output = self.model(input_tensor)   # FIX 4: was self.model.zero_grad() — wrong, that returns None
        probs  = output.softmax(1)[0].detach().cpu().numpy()

        if class_idx is None:
            class_idx = int(output.argmax(1).item())

        # FIX 7: backward now works because output is from the actual forward pass
        self.model.zero_grad()
        output[0, class_idx].backward()

        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam     = torch.relu((weights * self.activations).sum(dim=1, keepdim=True))
        cam     = (cam - cam.min()) / (cam.max() + 1e-8)
        cam_np  = cv2.resize(
            cam.squeeze().cpu().numpy(),
            (img_size[1], img_size[0])
        )

        heatmap = cv2.applyColorMap(
            np.uint8(255 * cam_np),
            cv2.COLORMAP_JET
        )

        return heatmap, class_idx, probs

    def overlay(
        self,
        original_img : Image.Image,
        heatmap      : np.ndarray,
        alpha        : float = 0.45
    ) -> Image.Image:
        """
        Blend heatmap onto original image.

        Args:
            original_img: PIL image
            heatmap     : BGR numpy array from generate()
            alpha       : heatmap opacity (0=invisible, 1=full)

        Returns:
            PIL image with heatmap overlay
        """
        h, w        = heatmap.shape[:2]
        img_np      = np.array(original_img.resize((w, h)))
        heatmap_rgb = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
        blended     = cv2.addWeighted(img_np, 1 - alpha, heatmap_rgb, alpha, 0)
        return Image.fromarray(blended)

    def generate_and_encode(
        self,
        input_tensor : torch.Tensor,
        original_img : Image.Image,
        class_idx    : int = None
    ) -> dict:
        """
        Full pipeline: generate heatmap + overlay + encode to base64.
        Returns dict ready for JSON API response.
        """
        img_size = (original_img.height, original_img.width)
        img_size = (min(img_size[0], 512), min(img_size[1], 512))

        heatmap, pred_idx, probs = self.generate(input_tensor, class_idx, img_size)

        overlay_img = self.overlay(original_img, heatmap)
        heatmap_pil = Image.fromarray(cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB))

        return {
            "predicted_class_idx" : pred_idx,
            "probabilities"       : probs.tolist(),
            "confidence"          : round(float(probs[pred_idx]) * 100, 2),
            "overlay_base64"      : image_to_base64(overlay_img),
            "heatmap_base64"      : image_to_base64(heatmap_pil),
        }

    def remove_hooks(self):
        """Clean up hooks — call when done to free memory."""
        for hook in self._hooks:
            hook.remove()


class GradCAMManager:
    """Keeps one GradCAM instance per loaded model."""

    def __init__(self):
        self._instances = {}

    def get(self, model_name: str, model: nn.Module,
            arch: str = "resnet50") -> GradCAM:
        """Get or create GradCAM for a model."""
        if model_name not in self._instances:
            self._instances[model_name] = GradCAM(model, arch)
        return self._instances[model_name]

    def clear(self):
        """Remove all hooks and clear instances."""
        for instance in self._instances.values():
            instance.remove_hooks()
        self._instances.clear()