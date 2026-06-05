import logging

from clinical.diagnosis_parser import build_structured_symptom_query, parse_structured_response
from clinical.schemas import SymptomCheckResponse
from clinical.service import attach_clinical_flags

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "This tool is for educational purposes only. "
    "It does not replace professional medical advice, diagnosis, or treatment. "
    "Possible conditions listed are not confirmed diagnoses. "
    "Please consult a licensed healthcare professional."
)


def check_symptoms(symptoms: list, rag_instance=None) -> dict:
    """
    Match symptoms using RAG system (ChromaDB + Mistral) and return structured diagnoses.
    """
    if not symptoms:
        return SymptomCheckResponse(
            input_symptoms=symptoms,
            answer="",
            sources=[],
            disclaimer="No symptoms provided.",
        ).model_dump()

    if rag_instance is None:
        return SymptomCheckResponse(
            input_symptoms=symptoms,
            answer="RAG system not available. Add MISTRAL_API_KEY to .env and restart the backend.",
            sources=[],
            disclaimer=DISCLAIMER,
        ).model_dump()

    query = build_structured_symptom_query(symptoms)

    try:
        result = rag_instance.query(
            question=query,
            context_hint=", ".join(symptoms),
            max_tokens=1600,
            mode="symptom",
        )
        parsed = parse_structured_response(result.get("answer", ""))
        diagnoses = attach_clinical_flags(parsed.get("diagnoses", []))

        summary = parsed.get("summary", "")
        answer = result.get("answer", "")
        if summary and summary not in answer:
            answer = f"{summary}\n\n{answer}"

        response = SymptomCheckResponse(
            input_symptoms=symptoms,
            summary=summary,
            diagnoses=diagnoses,
            answer=answer,
            sources=result.get("sources", []),
            disclaimer=DISCLAIMER,
        )
        return response.model_dump()
    except Exception as exc:
        logger.exception("[SymptomChecker] Failed: %s", exc)
        return SymptomCheckResponse(
            input_symptoms=symptoms,
            answer=f"Error querying knowledge base: {exc}",
            sources=[],
            disclaimer=DISCLAIMER,
        ).model_dump()
