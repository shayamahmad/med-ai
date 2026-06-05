from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from env_config import load_project_env
from model_loader import registry
from image_utils import (
    preprocess_bytes,
    run_inference,
    load_image,
    preprocess_image,
)
from gradcam import GradCAMManager
from symptom_checker import check_symptoms
from clinical.schemas import DiseaseLookupRequest
from clinical.db import get_disease_by_slug, list_disease_slugs
from clinical.service import get_or_generate_profile
from startup import get_rag, rag_status, run_startup_async

load_project_env()

# ───────────────────────────────────────────────────────────
# Logging
# ───────────────────────────────────────────────────────────

logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)

# ───────────────────────────────────────────────────────────
# Singletons
# ───────────────────────────────────────────────────────────

gradcam_manager = GradCAMManager()

# ───────────────────────────────────────────────────────────
# Startup / Shutdown
# ───────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting MedAI backend...")

    startup_info = await run_startup_async()
    app.state.startup = startup_info

    yield

    logger.info("Shutting down...")

# ───────────────────────────────────────────────────────────
# FastAPI App
# ───────────────────────────────────────────────────────────

app = FastAPI(
    title="Medical AI Platform",
    description="AI powered organ & disease analysis platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ───────────────────────────────────────────────────────────
# CORS
# ───────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────────────────────────────────────────────────────
# Helpers
# ───────────────────────────────────────────────────────────

def require_model(key: str):

    model = registry.get(key)

    if model is None:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model '{key}' is not loaded. "
                "Set HF_ASSETS_REPO in .env, run 'npm run download:assets', "
                "then restart the backend (or POST /system/sync-assets)."
            ),
        )

    return model


def _safe_rag():
    try:
        return get_rag()
    except RuntimeError:
        return None


def require_rag():
    try:
        return get_rag()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

# ───────────────────────────────────────────────────────────
# System Routes
# ───────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():

    return {
        "message": "Medical AI Platform is running"
    }


@app.get("/health", tags=["System"])
async def health():

    status = registry.status()
    rag_ready, rag_error = rag_status()

    return {
        "status": "ok",
        "models": status,
        "device": str(registry.device),
        "loaded": sum(status.values()),
        "total": len(status),
        "rag_ready": rag_ready,
        "rag_error": rag_error,
    }


@app.get("/models/status", tags=["System"])
async def model_status():

    return registry.status()


@app.post("/system/sync-assets", tags=["System"])
async def sync_assets():
    """Re-download assets (if configured) and reload CNN models without full restart."""
    from asset_loader import load_all_assets

    load_all_assets(force=True)
    registry.load_all_models()
    status = registry.status()
    loaded = sum(status.values())
    return {
        "status": "ok",
        "loaded": loaded,
        "total": len(status),
        "models": status,
    }

# ───────────────────────────────────────────────────────────
# Organ Classifier
# ───────────────────────────────────────────────────────────

@app.post("/classify/organ", tags=["Organ Classifier"])
async def classify_organ(file: UploadFile = File(...)):

    data = await file.read()

    model = registry.get("organ")
    if model is not None:
        labels = registry.labels.get("organ", [])
        tensor = preprocess_bytes(data, "organ")
        result = run_inference(
            model,
            tensor,
            labels,
            registry.device,
        )
        return {"model": "organ_v2", **result}

    if not registry.labels.get("organ"):
        registry.load_metadata_files()

    try:
        from organ_proxy import classify_organ_via_specialists

        result = classify_organ_via_specialists(data, registry)
        return {"model": "organ_proxy", **result}
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

# ───────────────────────────────────────────────────────────
# Disease Models
# ───────────────────────────────────────────────────────────

@app.post("/classify/chest", tags=["Disease Classifier"])
async def classify_chest(file: UploadFile = File(...)):

    model = require_model("chest")

    labels = registry.labels["chest"]

    data = await file.read()

    tensor = preprocess_bytes(data, "chest")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "chest",
        **result
    }


@app.post("/classify/brain", tags=["Disease Classifier"])
async def classify_brain(file: UploadFile = File(...)):

    model = require_model("brain")

    labels = registry.labels["brain"]

    data = await file.read()

    tensor = preprocess_bytes(data, "brain")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "brain",
        **result
    }


@app.post("/classify/eye", tags=["Disease Classifier"])
async def classify_eye(file: UploadFile = File(...)):

    model = require_model("eye")

    labels = registry.labels["eye"]

    data = await file.read()

    tensor = preprocess_bytes(data, "eye")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "eye",
        **result
    }


@app.post("/classify/skin", tags=["Disease Classifier"])
async def classify_skin(file: UploadFile = File(...)):

    model = require_model("skin")

    labels = registry.labels["skin"]

    data = await file.read()

    tensor = preprocess_bytes(data, "skin")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "skin",
        **result
    }


@app.post("/classify/bone", tags=["Disease Classifier"])
async def classify_bone(file: UploadFile = File(...)):

    model = require_model("bone")

    labels = registry.labels["bone"]

    data = await file.read()

    tensor = preprocess_bytes(data, "bone")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "bone",
        **result
    }


@app.post("/classify/knee", tags=["Disease Classifier"])
async def classify_knee(file: UploadFile = File(...)):

    model = require_model("knee")

    labels = registry.labels["knee"]

    data = await file.read()

    tensor = preprocess_bytes(data, "knee")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "knee",
        **result
    }


@app.post("/classify/dental", tags=["Disease Classifier"])
async def classify_dental(file: UploadFile = File(...)):

    model = require_model("dental")

    labels = registry.labels["dental"]

    data = await file.read()

    tensor = preprocess_bytes(data, "dental")

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    return {
        "model": "dental",
        **result
    }

# ───────────────────────────────────────────────────────────
# Auto Pipeline
# ───────────────────────────────────────────────────────────

@app.post("/classify/auto", tags=["Disease Classifier"])
async def classify_auto(file: UploadFile = File(...)):

    organ_model = require_model("organ")

    data = await file.read()

    organ_tensor = preprocess_bytes(data, "organ")

    organ_result = run_inference(
        organ_model,
        organ_tensor,
        registry.labels["organ"],
        registry.device
    )

    organ_name = organ_result["prediction"]

    result = registry.get_disease_model(organ_name)

    if result is None or result[1] is None:

        return {
            "organ": organ_result,
            "disease": None,
            "note": f"No disease model mapped for {organ_name}",
        }

    key, disease_model, disease_labels = result

    disease_tensor = preprocess_bytes(data, key)

    disease_result = run_inference(
        disease_model,
        disease_tensor,
        disease_labels,
        registry.device
    )

    return {
        "organ": organ_result,
        "disease_model": key,
        "disease": disease_result,
    }

# ───────────────────────────────────────────────────────────
# GradCAM
# ───────────────────────────────────────────────────────────

@app.post("/explain/gradcam", tags=["Explainability"])
async def explain_gradcam(
    file: UploadFile = File(...),
    model_key: str = Query(default="organ")
):

    model = require_model(model_key)

    data = await file.read()

    image = load_image(data)

    tensor = preprocess_image(image, model_key)

    arch_map = {
        "organ": "resnet50",
        "brain": "resnet50",
        "eye": "resnet50",
        "knee": "resnet50",
        "dental": "resnet50",
        "bone": "resnet50",
        "chest": "densenet",
        "skin": "efficientnet",
    }

    arch = arch_map.get(model_key, "resnet50")

    try:

        gcam = gradcam_manager.get(
            model_key,
            model,
            arch
        )

        labels = registry.labels[model_key]

        result = gcam.generate_and_encode(
            tensor.to(registry.device),
            image
        )

        pred_label = labels[result["predicted_class_idx"]]

        confidence = result["confidence"]

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"GradCAM failed: {str(e)}"
        )

    return {
        "model": model_key,
        "prediction": pred_label,
        "confidence": confidence,
        "overlay_base64": result["overlay_base64"],
        "heatmap_base64": result["heatmap_base64"],
    }

# ───────────────────────────────────────────────────────────
# Symptom Checker
# ───────────────────────────────────────────────────────────

@app.post("/symptom-check", tags=["Diagnosis"])
async def symptom_check(payload: dict):

    symptoms = payload.get("symptoms", [])

    if not symptoms:
        raise HTTPException(
            status_code=400,
            detail="No symptoms provided."
        )

    return check_symptoms(
        symptoms,
        rag_instance=_safe_rag(),
    )

# ───────────────────────────────────────────────────────────
# Clinical Disease Profiles
# ───────────────────────────────────────────────────────────

@app.get("/clinical/diseases", tags=["Clinical"])
async def clinical_disease_index(limit: int = Query(default=100, ge=1, le=500)):
    return {"diseases": list_disease_slugs(limit=limit)}


@app.get("/clinical/diseases/{slug}", tags=["Clinical"])
async def clinical_disease_detail(
    slug: str,
    name: str = Query(default=""),
    generate: bool = Query(default=True),
):
    profile = get_disease_by_slug(slug)
    if profile is None and name:
        profile = get_or_generate_profile(
            name,
            rag_instance=_safe_rag(),
            generate=generate,
        )
    if profile is None and generate:
        profile = get_or_generate_profile(
            slug.replace("-", " "),
            rag_instance=_safe_rag(),
            generate=True,
        )
    if profile is None:
        raise HTTPException(status_code=404, detail="Disease profile not found.")
    return profile.model_dump()


@app.post("/clinical/diseases/lookup", tags=["Clinical"])
async def clinical_disease_lookup(payload: DiseaseLookupRequest):
    profile = get_or_generate_profile(
        payload.name,
        rag_instance=_safe_rag(),
        generate=payload.generate_if_missing,
    )
    if profile is None:
        raise HTTPException(
            status_code=404,
            detail="No clinical profile available for this condition.",
        )
    return profile.model_dump()

# ───────────────────────────────────────────────────────────
# RAG Query
# ───────────────────────────────────────────────────────────

@app.post("/rag/query", tags=["Education"])
async def rag_query(payload: dict):

    query = payload.get("query", "").strip()

    if not query:
        raise HTTPException(
            status_code=400,
            detail="Query is empty."
        )

    rag = require_rag()
    answer = rag.tutor_chat(query)

    return {
        "query": query,
        "answer": answer.get("answer", ""),
        "sources": answer.get("sources", []),
    }

# ───────────────────────────────────────────────────────────
# Quiz Mode
# ───────────────────────────────────────────────────────────

@app.post("/quiz/check", tags=["Education"])
async def quiz_check(
    file: UploadFile = File(...),
    answer: str = Query(...),
    model_key: str = Query(default="organ")
):

    model = require_model(model_key)

    labels = registry.labels[model_key]

    data = await file.read()

    tensor = preprocess_bytes(data, model_key)

    result = run_inference(
        model,
        tensor,
        labels,
        registry.device
    )

    correct = (
        answer.strip().lower()
        == result["prediction"].lower()
    )

    return {
        "user_answer": answer,
        "correct": correct,
        "actual": result["prediction"],
        "confidence": result["confidence"],
        "top_k": result["top_k"],
    }

# ───────────────────────────────────────────────────────────
# Local Run
# ───────────────────────────────────────────────────────────

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )