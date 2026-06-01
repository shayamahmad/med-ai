#!/usr/bin/env python3
"""Download CNN weights + RAG data, then load models into memory."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")
load_dotenv(BACKEND / ".env")

from asset_loader import load_all_assets, models_present
from model_loader import registry


def main() -> None:
    print("MedAI — downloading assets...")
    load_all_assets(force=True)
    if models_present():
        print("Loading models into memory...")
        registry.load_all_models()
        status = registry.status()
        loaded = sum(status.values())
        print(f"Done: {loaded}/8 models loaded — {status}")
        if loaded == 0:
            sys.exit(1)
    else:
        print(
            "No .pth files found under backend/models.\n"
            "Set HF_ASSETS_REPO in .env (see README), then run this script again."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
