"""
Download models, ChromaDB, and medical sources from Hugging Face Hub.

Set HF_ASSETS_REPO (e.g. shayamahmad/medai-assets). Public repos: free, no token.
Private repos: set HF_TOKEN.

Auto-download on server start is OFF by default (avoids slow/crashy startup).
Run: npm run download:assets
Or set HF_DOWNLOAD_ON_START=1 in .env
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
CHROMADB_DIR = BASE_DIR / "chromadb"
MEDICAL_SOURCES_DIR = BASE_DIR / "medical_sources"

ASSET_PATTERNS = [
    "models/**",
    "chromadb/**",
    "medical_sources/**",
]


def models_present() -> bool:
    if not MODELS_DIR.is_dir():
        return False
    return any(MODELS_DIR.rglob("*.pth"))


def _download_on_start_enabled(force: bool) -> bool:
    if force:
        return True
    flag = os.environ.get("HF_DOWNLOAD_ON_START", "").strip().lower()
    return flag in ("1", "true", "yes")


def load_all_assets(force: bool = False) -> None:
    if models_present() and not force:
        logger.info("[Assets] Local models found — skipping download")
        return

    if not _download_on_start_enabled(force):
        logger.info(
            "[Assets] Skipping Hugging Face download on startup. "
            "Run 'npm run download:assets' or set HF_DOWNLOAD_ON_START=1."
        )
        return

    repo_id = os.environ.get("HF_ASSETS_REPO", "").strip()
    if not repo_id or repo_id.startswith("your-"):
        if force:
            logger.info(
                "[Assets] HF_ASSETS_REPO not configured — skipping custom dataset download. "
                "Public model fallbacks will be used at load time."
            )
        else:
            logger.warning(
                "[Assets] HF_ASSETS_REPO not configured. Image classifiers need model files.\n"
                "  1. Create a free dataset: https://huggingface.co/new-dataset\n"
                "  2. Upload backend/models, chromadb, medical_sources (see README)\n"
                "  3. Set HF_ASSETS_REPO=your-username/medai-assets in .env\n"
                "  4. Run: npm run download:assets"
            )
        return

    try:
        from huggingface_hub import snapshot_download
    except ImportError as exc:
        raise RuntimeError(
            "Install huggingface_hub: pip install huggingface_hub"
        ) from exc

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    repo_type = os.environ.get("HF_REPO_TYPE", "dataset")

    logger.info("[Assets] Downloading from Hugging Face: %s (%s)", repo_id, repo_type)
    try:
        snapshot_download(
            repo_id=repo_id,
            repo_type=repo_type,
            local_dir=str(BASE_DIR),
            allow_patterns=ASSET_PATTERNS,
            token=token or None,
            max_workers=1,
        )
        logger.info("[Assets] Download complete")
    except Exception as exc:
        logger.error(
            "[Assets] Download failed (server will continue without custom weights): %s",
            exc,
        )
