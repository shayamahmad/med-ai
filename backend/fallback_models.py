"""Public Hugging Face fallbacks when custom .pth weights are not on disk."""

import logging
from typing import Any

import torch
import torch.nn as nn
from torchvision import models

logger = logging.getLogger(__name__)

FALLBACKS: dict[str, dict[str, Any]] = {
    "brain": {
        "repo_id": "Abuzaid01/brain-tumor-resnet50-classifier",
        "filename": "model.safetensors",
        "builder": "resnet50_compact",
        "num_classes": None,
    },
    "chest": {
        "repo_id": "itsomk/chexpert-densenet121",
        "filename": "pytorch_model.safetensors",
        "builder": "densenet121_chexpert_mapped",
        "num_classes": 14,
    },
    "bone": {
        "repo_id": "camtay07/bone_fracture_model",
        "builder": "vit_transformers",
        "num_classes": 2,
    },
}


def _build_resnet50_compact(num_classes: int) -> nn.Module:
    model = models.resnet50(weights=None)
    model.fc = nn.Sequential(
        nn.Linear(model.fc.in_features, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, num_classes),
    )
    return model


def _build_densenet121_chexpert(num_classes: int = 14) -> nn.Module:
    model = models.densenet121(weights=None)
    model.classifier = nn.Linear(model.classifier.in_features, num_classes)
    return model


class MappedChestModel(nn.Module):
    """Map CheXpert multi-label outputs to MedAI's 5-class chest taxonomy."""

    def __init__(self, base: nn.Module):
        super().__init__()
        self.base = base

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        logits14 = self.base(x)
        probs14 = torch.sigmoid(logits14)

        covid = (
            0.35 * probs14[:, 6]
            + 0.35 * probs14[:, 7]
            + 0.20 * probs14[:, 5]
            + 0.20 * probs14[:, 3]
        )
        normal = probs14[:, 0] * 1.5 + (1.0 - probs14[:, 1:].max(dim=1).values) * 0.5
        pneumonia = 0.65 * probs14[:, 7] + 0.35 * probs14[:, 6]
        opacity = 0.70 * probs14[:, 3] + 0.30 * probs14[:, 6]
        tuberculosis = (
            0.45 * probs14[:, 6]
            + 0.25 * probs14[:, 4]
            + 0.20 * probs14[:, 10]
            + 0.10 * probs14[:, 3]
        )

        mapped = torch.stack(
            [covid, normal, pneumonia, opacity, tuberculosis],
            dim=1,
        ).clamp(min=1e-6)
        return torch.log(mapped)


BUILDERS = {
    "resnet50_compact": _build_resnet50_compact,
    "densenet121_chexpert": _build_densenet121_chexpert,
}


def _load_vit_transformers(spec: dict, device: torch.device):
    from transformers import AutoModelForImageClassification

    class VitWrapper(nn.Module):
        def __init__(self, base: nn.Module):
            super().__init__()
            self.base = base

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.base(x).logits

    base = AutoModelForImageClassification.from_pretrained(spec["repo_id"])
    model = VitWrapper(base)
    model.to(device)
    model.eval()
    return model


def load_fallback_model(key: str, meta: dict, device: torch.device):
    spec = FALLBACKS.get(key)
    if not spec:
        return None

    if spec.get("builder") == "vit_transformers":
        try:
            model = _load_vit_transformers(spec, device)
            logger.info(
                "Loaded fallback model '%s' from Hugging Face: %s",
                key,
                spec["repo_id"],
            )
            return model
        except Exception as exc:
            logger.error("Fallback load failed for '%s': %s", key, exc)
            return None

    try:
        from huggingface_hub import hf_hub_download
        from safetensors.torch import load_file
    except ImportError:
        logger.error("Install huggingface_hub and safetensors for fallback models")
        return None

    try:
        weights_path = None
        last_exc = None
        for attempt in range(3):
            try:
                weights_path = hf_hub_download(
                    repo_id=spec["repo_id"],
                    filename=spec["filename"],
                )
                break
            except RuntimeError as exc:
                last_exc = exc
                if "client has been closed" not in str(exc).lower():
                    raise
                logger.warning(
                    "HF download retry %s/3 for '%s': %s",
                    attempt + 1,
                    key,
                    exc,
                )
                import time
                time.sleep(1.5 * (attempt + 1))

        if weights_path is None:
            raise last_exc or RuntimeError("HF download failed")

        builder_name = spec["builder"]
        num_classes = spec.get("num_classes") or meta["num_classes"]

        if builder_name == "densenet121_chexpert_mapped":
            base = _build_densenet121_chexpert(num_classes)
            state = load_file(weights_path)
            base.load_state_dict(state, strict=False)
            model = MappedChestModel(base)
        else:
            builder = BUILDERS[builder_name]
            model = builder(meta["num_classes"])
            state = load_file(weights_path)
            model.load_state_dict(state, strict=True)

        model.to(device)
        model.eval()
        logger.info(
            "Loaded fallback model '%s' from Hugging Face: %s",
            key,
            spec["repo_id"],
        )
        return model
    except Exception as exc:
        logger.error("Fallback load failed for '%s': %s", key, exc)
        return None
