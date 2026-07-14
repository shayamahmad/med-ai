#!/usr/bin/env python3
"""Download CNN weights + RAG data, then load models into memory."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv

from env_config import load_project_env

load_project_env()

from asset_loader import load_all_assets, models_present
from model_loader import registry


def _hf_repo_configured() -> bool:
    repo = os.environ.get("HF_ASSETS_REPO", "").strip()
    return bool(repo) and not repo.startswith("your-")


def main() -> None:
    print("MedAI — downloading assets...")

    if _hf_repo_configured():
        print(f"HF_ASSETS_REPO={os.environ.get('HF_ASSETS_REPO', '').strip()}")
    else:
        print("HF_ASSETS_REPO not set — skipping custom asset download.")

    load_all_assets(force=True)

    if models_present():
        print("Local model weights found under backend/models.")
    elif _hf_repo_configured():
        print("Attempted download from HF_ASSETS_REPO.")
    else:
        print("Using public Hugging Face fallback weights where available.")

    print("Loading models into memory (first run may take 1-2 min)...")
    registry.load_all_models()
    status = registry.status()
    loaded = sum(status.values())
    print(f"Done: {loaded}/8 models loaded — {status}")

    if loaded == 0:
        print(
            "\nNo models could be loaded.\n"
            "Check your internet connection, then retry.\n"
            "For custom weights + RAG/ChromaDB data, set HF_ASSETS_REPO in .env "
            "and run this script again."
        )
        sys.exit(1)

    missing = [name for name, ok in status.items() if not ok]
    if missing:
        print(f"\nNot loaded (no fallback yet): {', '.join(missing)}")
    if not models_present() and not _hf_repo_configured():
        print(
            "\nTip: bone, brain, and chest work via fallbacks without HF_ASSETS_REPO.\n"
            "For organ/eye/skin/knee/dental custom weights + RAG data, configure "
            "HF_ASSETS_REPO in .env (see README)."
        )


if __name__ == "__main__":
    main()
