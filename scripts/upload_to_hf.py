#!/usr/bin/env python3
"""Upload local backend assets to a Hugging Face dataset (one-time migration from AWS/local)."""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload MedAI assets to Hugging Face Hub")
    parser.add_argument("repo_id", help="Dataset id, e.g. shayamahmad/medai-assets")
    parser.add_argument(
        "--repo-type", default="dataset", choices=["dataset", "model"], help="HF repo type"
    )
    args = parser.parse_args()

    try:
        from huggingface_hub import HfApi
    except ImportError:
        print("pip install huggingface_hub", file=sys.stderr)
        sys.exit(1)

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_HUB_TOKEN")
    if not token:
        print("Set HF_TOKEN or run: huggingface-cli login", file=sys.stderr)
        sys.exit(1)

    api = HfApi(token=token)
    folders = [
        (BACKEND / "models", "models"),
        (BACKEND / "chromadb", "chromadb"),
        (BACKEND / "medical_sources", "medical_sources"),
    ]

    for local, path_in_repo in folders:
        if not local.is_dir() or not any(local.rglob("*")):
            print(f"Skip (empty): {local}")
            continue
        print(f"Uploading {local} -> {args.repo_id}/{path_in_repo} ...")
        api.upload_folder(
            folder_path=str(local),
            path_in_repo=path_in_repo,
            repo_id=args.repo_id,
            repo_type=args.repo_type,
        )

    print(f"\nDone. Add to .env:\n  HF_ASSETS_REPO={args.repo_id}")


if __name__ == "__main__":
    main()
