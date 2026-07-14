from clinical.diagnosis_parser import parse_structured_response

TRUNCATED = """```json
{
  "summary": "A 4-year-old child with fever, right lower quadrant pain, bowel issues, and elevated white blood cell count requires careful evaluation. Appendicitis is a common concern in this age group, but other conditions must also be considered.",
  "diagnoses": [
    {
      "rank": 1,
      "name": "Acute Appendicitis",
      "match_reason": "Fever, right lower quadrant pain, elevated white"""


def test_truncated_json_recovery():
    parsed = parse_structured_response(TRUNCATED)
    assert parsed["summary"].startswith("A 4-year-old")
    assert len(parsed["diagnoses"]) >= 1
    assert parsed["diagnoses"][0]["name"] == "Acute Appendicitis"
    assert parsed["diagnoses"][0]["name"] != "```json"


def test_valid_json():
    valid = """{"summary": "Test summary", "diagnoses": [{"rank": 1, "name": "Flu", "match_reason": "Fever", "distinguishing_features": "", "urgency": "low", "urgency_guidance": "Rest", "seek_care_now": false}]}"""
    parsed = parse_structured_response(valid)
    assert parsed["summary"] == "Test summary"
    assert parsed["diagnoses"][0]["name"] == "Flu"
