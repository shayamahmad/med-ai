# backend/s3_loader.py

import boto3
import os
from pathlib import Path

# ── ENV CONFIG ─────────────────────────────────────────────

S3_BUCKET = os.environ.get("S3_BUCKET", "td-medai-bucket")

AWS_REGION = os.environ.get("AWS_REGION", "ap-south-2")

# ── LOCAL DIRECTORIES ─────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent

MODELS_DIR = BASE_DIR / "models"

CHROMADB_DIR = BASE_DIR / "chromadb"

MEDICAL_SOURCES_DIR = BASE_DIR / "medical_sources"

# ── S3 CLIENT ─────────────────────────────────────────────

def get_s3_client():

    return boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        region_name=AWS_REGION,
    )

# ── DOWNLOAD FILE ─────────────────────────────────────────

def download_file(s3, s3_key: str, local_path: Path):

    if local_path.exists():
        print(f"✅ Cached: {local_path}")

        return

    print(f"⬇ Downloading: {s3_key}")

    local_path.parent.mkdir(parents=True, exist_ok=True)

    s3.download_file(
        S3_BUCKET,
        s3_key,
        str(local_path)
    )

    print(f"✅ Downloaded: {local_path.name}")

# ── LOAD MODELS ───────────────────────────────────────────

def load_models(s3):

    print("\n📦 Loading models from S3...")

    paginator = s3.get_paginator("list_objects_v2")

    pages = paginator.paginate(
        Bucket=S3_BUCKET,
        Prefix="models/"
    )

    for page in pages:

        for obj in page.get("Contents", []):

            key = obj["Key"]

            if key.endswith("/"):
                continue

            # Remove "models/" prefix
            relative = key.replace("models/", "")

            local_path = MODELS_DIR / relative

            download_file(
                s3,
                key,
                local_path
            )

    print("✅ Models ready")

# ── LOAD CHROMADB ─────────────────────────────────────────

def load_chromadb(s3):

    print("\n📦 Loading ChromaDB from S3...")

    paginator = s3.get_paginator("list_objects_v2")

    pages = paginator.paginate(
        Bucket=S3_BUCKET,
        Prefix="chromadb/"
    )

    for page in pages:

        for obj in page.get("Contents", []):

            key = obj["Key"]

            if key.endswith("/"):
                continue

            relative = key.replace("chromadb/", "")

            local_path = CHROMADB_DIR / relative

            download_file(
                s3,
                key,
                local_path
            )

    print("✅ ChromaDB ready")

# ── LOAD MEDICAL SOURCES ─────────────────────────────────

def load_medical_sources(s3):

    print("\n📦 Loading medical sources from S3...")

    paginator = s3.get_paginator("list_objects_v2")

    pages = paginator.paginate(
        Bucket=S3_BUCKET,
        Prefix="medical_sources/"
    )

    for page in pages:

        for obj in page.get("Contents", []):

            key = obj["Key"]

            if key.endswith("/"):
                continue

            relative = key.replace("medical_sources/", "")

            local_path = MEDICAL_SOURCES_DIR / relative

            download_file(
                s3,
                key,
                local_path
            )

    print("✅ Medical sources ready")

# ── MASTER FUNCTION ──────────────────────────────────────

def load_all_assets():

    print("\n🚀 Starting S3 sync...\n")

    s3 = get_s3_client()

    load_models(s3)

    load_chromadb(s3)

    load_medical_sources(s3)

    print("\n🎉 All assets loaded successfully\n")