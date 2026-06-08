"""Heavy startup work: optional asset download, CNN weights, RAG engine."""

import asyncio
import logging
import os
from typing import Any

from asset_loader import load_all_assets
from clinical import init_clinical_db
from env_config import load_project_env
from model_loader import registry
from study import init_study_db

logger = logging.getLogger(__name__)

_rag: Any = None
_rag_error: str | None = None


def mistral_configured() -> bool:
    load_project_env()
    key = os.environ.get("MISTRAL_API_KEY", "").strip()
    return bool(key) and not key.startswith("your_")


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


def reset_rag_cache() -> None:
    """Clear cached RAG failure so a retry can succeed after .env updates."""
    global _rag, _rag_error
    _rag = None
    _rag_error = None


def get_rag():
    """Return the RAG singleton, initializing it on first use."""
    global _rag, _rag_error

    if _rag is not None:
        if _rag.mistral is None and mistral_configured():
            logger.info("[Startup] MISTRAL_API_KEY now set — reinitializing RAG")
            reset_rag_cache()
        else:
            return _rag

    if _rag_error is not None:
        if mistral_configured():
            logger.info("[Startup] Retrying RAG init after previous failure")
            _rag_error = None
        else:
            raise RuntimeError(_rag_error)

    if not mistral_configured():
        raise RuntimeError(
            "MISTRAL_API_KEY not set. Add it to .env in the project root and restart the backend."
        )

    load_project_env()
    try:
        from rag_system import MedicalRAG

        _rag = MedicalRAG()
        if _rag.mistral is None:
            raise RuntimeError(
                "MISTRAL_API_KEY not loaded. Restart the backend via npm start after editing .env."
            )
        logger.info("[Startup] RAG engine ready (Mistral + ChromaDB)")
        return _rag
    except Exception as exc:
        _rag_error = str(exc)
        raise RuntimeError(_rag_error) from exc


def rag_status() -> tuple[bool, str | None]:
    if _rag is not None and _rag.mistral is not None:
        return True, None
    if not mistral_configured():
        return False, "MISTRAL_API_KEY not set in .env"
    if _rag_error is not None:
        return False, _rag_error
    return False, "RAG initializing — wait ~30s after backend start, then retry"


def init_rag_on_first_use() -> None:
    """Warm up RAG (Mistral + embeddings). Safe to run in a background thread."""
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
