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
        "metadata": "brain_metadata.json",
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


BUILDERS = {
    "resnet50_compact": _build_resnet50_compact,
}


def load_fallback_model(key: str, meta: dict, device: torch.device):
    spec = FALLBACKS.get(key)
    if not spec:
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

        builder = BUILDERS[spec["builder"]]
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
