"""Proxy GLB anatomy models so the browser avoids cross-origin S3/HF restrictions."""

import logging
import os
import re

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/3d-models", tags=["3D Models"])

DEFAULT_S3_BASE = "https://td-medai-bucket.s3.ap-south-2.amazonaws.com/3d-models"
_PLACEHOLDER_RE = re.compile(r"your-username|placeholder|example", re.I)
_SAFE_FILENAME = re.compile(r"^[a-zA-Z0-9_.-]+\.glb$")


def _upstream_base() -> str:
    custom = os.environ.get("MODELS_3D_UPSTREAM", "").strip()
    if custom:
        return custom.rstrip("/")

    repo = os.environ.get("HF_ASSETS_REPO", "").strip()
    if repo and not _PLACEHOLDER_RE.search(repo):
        kind = os.environ.get("HF_REPO_TYPE", "dataset")
        if kind == "dataset":
            return f"https://huggingface.co/datasets/{repo}/resolve/main/3d-models"
        return f"https://huggingface.co/{repo}/resolve/main/3d-models"

    return DEFAULT_S3_BASE


@router.get("/{filename}")
async def proxy_glb(filename: str):
    if not _SAFE_FILENAME.match(filename):
        raise HTTPException(status_code=400, detail="Invalid model filename.")

    url = f"{_upstream_base()}/{filename}"
    logger.debug("Proxying 3D model: %s", url)

    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Could not fetch {filename} from asset host.",
                )
            return Response(
                content=resp.content,
                media_type="model/gltf-binary",
                headers={"Cache-Control": "public, max-age=86400"},
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("3D model proxy failed for %s: %s", filename, exc)
        raise HTTPException(status_code=502, detail="Failed to fetch 3D model.") from exc
