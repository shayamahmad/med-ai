import json 
import os 
import re 
import math 
import collections
from collections import Counter 


def _build_query(symptoms: list) -> str:
    """Build a structured clinical query from symptom list."""
    symptom_text = ", ".join(symptoms)
    return (
        f"A patient presents with the following symptoms: {symptom_text}. "
        f"Based on these symptoms, what are the most likely medical diagnoses? "
        f"For each possible diagnosis explain: "
        f"1) Why it matches these symptoms "
        f"2) Key distinguishing features "
        f"3) Urgency level (low/medium/high) "
        f"4) Whether the patient should see a doctor immediately. "
        f"Be specific and clinical."
    )


def check_symptoms(symptoms: list, rag_instance=None) -> dict:
    """
    Match symptoms using RAG system (ChromaDB + Mistral).

    Args:
        symptoms:     List of symptom strings e.g. ["fever", "dry cough", "fatigue"]
        rag_instance: MedicalRAG instance from rag_system.py

    Returns:
        {
            "input_symptoms": [...],
            "answer": "Clinical differential diagnosis from Mistral...",
            "sources": [...],
            "disclaimer": "..."
        }
    """
    if not symptoms:
        return {
            "input_symptoms": symptoms,
            "answer": "",
            "sources": [],
            "disclaimer": "No symptoms provided.",
        }

    if rag_instance is None:
        return {
            "input_symptoms": symptoms,
            "answer": "RAG system not available.",
            "sources": [],
            "disclaimer": "For educational purposes only.",
        }

    query = _build_query(symptoms)

    try:
        result = rag_instance.tutor_chat(query)
        return {
            "input_symptoms": symptoms,
            "answer":    result.get("answer", ""),
            "sources":   result.get("sources", []),
            "disclaimer": (
                "This tool is for educational purposes only. "
                "It does not replace professional medical advice. "
                "Please consult a qualified doctor for diagnosis."
            ),
        }
    except Exception as e:
        return {
            "input_symptoms": symptoms,
            "answer": f"Error querying knowledge base: {str(e)}",
            "sources": [],
            "disclaimer": "For educational purposes only.",
        }


async def check_symptoms_with_mistralai(description: str, rag_instance=None) -> dict:
    """
    Extract structured symptoms from natural language description
    then run check_symptoms with RAG.
    """
    import httpx

    prompt = f"""
A patient described their symptoms as:
"{description}"

Extract a list of individual medical symptoms from this description.
Reply ONLY with a JSON array of symptom strings, e.g.:
["fever", "dry cough", "shortness of breath", "fatigue"]
No explanation. No markdown. Just the JSON array.
"""

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": os.environ.get("ANTHROPIC_API_KEY", ""),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
        data = resp.json()
        raw  = data["content"][0]["text"].strip()
        raw  = re.sub(r"```json|```", "", raw).strip()
        extracted = json.loads(raw)
        if isinstance(extracted, list):
            return check_symptoms(extracted, rag_instance=rag_instance)
    except Exception:
        pass

    # Fallback: treat whole description as one symptom string
    return check_symptoms([description], rag_instance=rag_instance)