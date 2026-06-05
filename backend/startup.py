"""Heavy startup work: optional asset download, CNN weights, RAG engine."""

import asyncio
import logging
from typing import Any

from asset_loader import load_all_assets
from clinical import init_clinical_db
from env_config import load_project_env
from model_loader import registry

logger = logging.getLogger(__name__)

_rag: Any = None
_rag_error: str | None = None


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


def run_startup() -> dict[str, Any]:
    """Sync startup pipeline — safe to call from a worker thread."""
    load_project_env()

    try:
        init_clinical_db()
    except Exception as exc:
        logger.warning("[Startup] Clinical DB init failed: %s", exc)

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

    return {"models": status, "loaded": loaded, "total": len(status)}


async def run_startup_async() -> dict[str, Any]:
    return await asyncio.to_thread(run_startup)
