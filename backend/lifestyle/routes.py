"""Diet & Lifestyle API routes."""

from fastapi import APIRouter, HTTPException

from lifestyle.schemas import DietLifestyleRequest
from lifestyle.service import generate_diet_lifestyle_report

router = APIRouter(prefix="/lifestyle", tags=["Diet & Lifestyle"])


@router.post("/recommendations")
async def lifestyle_recommendations(payload: DietLifestyleRequest):
    from startup import get_rag

    try:
        rag = get_rag()
    except RuntimeError:
        rag = None
    try:
        return generate_diet_lifestyle_report(payload, rag_instance=rag).model_dump()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to generate lifestyle report.") from exc
