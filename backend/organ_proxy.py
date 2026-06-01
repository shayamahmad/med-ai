"""
Route organ classification through loaded disease specialists when organ weights are missing.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from image_utils import preprocess_bytes, run_inference

if TYPE_CHECKING:
    from model_loader import ModelRegistry

logger = logging.getLogger(__name__)

# specialist model key -> organ label used by auto-pipeline
SPECIALIST_ORGAN_MAP: list[tuple[str, str]] = [
    ("brain", "Brain"),
    ("chest", "Lung_Chest"),
    ("skin", "Skin"),
    ("eye", "Eye_OCT"),
    ("bone", "Bone"),
    ("knee", "Knee"),
    ("dental", "Teeth"),
]


def classify_organ_via_specialists(data: bytes, registry: "ModelRegistry") -> dict:
    organ_labels = registry.labels.get("organ") or []
    scores: dict[str, float] = {label: 0.0 for label in organ_labels}

    used = 0
    for model_key, organ_name in SPECIALIST_ORGAN_MAP:
        model = registry.get(model_key)
        labels = registry.labels.get(model_key)
        if model is None or not labels:
            continue

        tensor = preprocess_bytes(data, model_key)
        result = run_inference(
            model, tensor, labels, registry.device, top_k=1
        )
        conf = float(result["confidence"])
        if organ_name in scores:
            scores[organ_name] = conf
        used += 1
        logger.info(
            "Organ proxy: %s -> %s (%.2f)",
            model_key,
            organ_name,
            conf,
        )

    if used == 0:
        raise RuntimeError(
            "No specialist models available for organ proxy. "
            "Load at least one disease model or set HF_ASSETS_REPO."
        )

    best_organ = max(scores, key=scores.get)
    best_conf = scores[best_organ]
    total = sum(scores.values()) or 1.0
    normalized = {k: v / total for k, v in scores.items()}

    top_k = sorted(
        [{"label": k, "confidence": v} for k, v in normalized.items()],
        key=lambda x: x["confidence"],
        reverse=True,
    )[:5]

    return {
        "prediction": best_organ,
        "confidence": best_conf,
        "top_k": top_k,
        "all_scores": normalized,
    }
