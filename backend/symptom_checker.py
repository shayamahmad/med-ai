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
        try:
            from startup import get_rag

            rag_instance = get_rag()
        except RuntimeError as exc:
            return SymptomCheckResponse(
                input_symptoms=symptoms,
                answer=str(exc),
                sources=[],
                disclaimer=DISCLAIMER,
            ).model_dump()

    query = build_structured_symptom_query(symptoms)

    try:
        context_hint = symptoms[0] if len(symptoms) == 1 else ", ".join(symptoms)
        result = rag_instance.query(
            question=query,
            context_hint=context_hint,
            max_tokens=2400,
            mode="symptom",
        )
        parsed = parse_structured_response(result.get("answer", ""))
        diagnoses = attach_clinical_flags(parsed.get("diagnoses", []))

        summary = parsed.get("summary", "")
        # Use only the clean parsed summary — never forward the raw LLM JSON blob
        answer = summary

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
