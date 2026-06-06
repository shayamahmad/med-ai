"""Heavy startup work: optional asset download, CNN weights, RAG engine."""

import asyncio
import logging
from typing import Any

from asset_loader import load_all_assets
from clinical import init_clinical_db
from env_config import load_project_env
from model_loader import registry
from study import init_study_db

logger = logging.getLogger(__name__)

_rag: Any = None
_rag_error: str | None = None


def init_fast_services() -> None:
    """Lightweight init so study/clinical APIs respond immediately."""
    load_project_env()
    try:
        init_clinical_db()
    except Exception as exc:
        logger.warning("[Startup] Clinical DB init failed: %s", exc)
    try:
        init_study_db()
    except Exception as exc:
        logger.warning("[Startup] Study DB init failed: %s", exc)


def get_rag():
    """Return the RAG singleton, initializing it on first use."""
    global _rag, _rag_error

    if _rag is not None:
        return _rag
    if _rag_error is not None:
        raise RuntimeError(_rag_error)

    load_project_env()
    try:
        from rag_system import MedicalRAG

        _rag = MedicalRAG()
        return _rag
    except Exception as exc:
        _rag_error = str(exc)
        raise RuntimeError(_rag_error) from exc


def rag_status() -> tuple[bool, str | None]:
    if _rag is not None:
        return True, None
    if _rag_error is not None:
        return False, _rag_error
    return False, None


def init_rag_on_first_use() -> None:
    """Warm up RAG after CNN models are loaded."""
    try:
        get_rag()
    except RuntimeError as exc:
        logger.warning("[Startup] RAG unavailable: %s", exc)


def run_heavy_startup() -> dict[str, Any]:
    """Load CNN weights and warm RAG — safe to run in a background thread."""
    try:
        load_all_assets()
    except Exception as exc:
        logger.warning("[Startup] Asset download skipped: %s", exc)

    try:
        registry.load_all_models()
    except Exception as exc:
        logger.error("[Startup] Model loading failed: %s", exc)

    status = registry.status()
    loaded = sum(status.values())
    logger.info("Models loaded: %s/8 — %s", loaded, status)

    init_rag_on_first_use()

    return {"models": status, "loaded": loaded, "total": len(status), "status": "ready"}


async def run_heavy_startup_async() -> dict[str, Any]:
    return await asyncio.to_thread(run_heavy_startup)


async def run_startup_async() -> dict[str, Any]:
    """Backward-compatible alias."""
    return await run_heavy_startup_async()
