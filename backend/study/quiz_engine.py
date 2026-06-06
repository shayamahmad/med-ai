"""Quiz and exam generation, evaluation, analytics."""

import json
import logging
import uuid
from typing import Any

from study.book_rag import BookRAG, DISCLAIMER
from study.db import save_attempt
from study.schemas import ExamGenerateRequest, QuizGenerateRequest, QuizSubmitRequest

logger = logging.getLogger(__name__)

_pending_attempts: dict[str, dict] = {}


def _build_quiz_prompt(config: QuizGenerateRequest, book_title: str) -> str:
    types = ", ".join(config.question_types)
    chapters = ", ".join(config.chapter_ids) if config.chapter_ids else "all chapters"
    topics = ", ".join(config.topics) if config.topics else "full book coverage"
    return (
        f"Generate {config.num_questions} {config.difficulty} difficulty questions "
        f"for the textbook '{book_title}'. Question types: {types}. "
        f"Chapters: {chapters}. Topics: {topics}. Style: {config.exam_style}."
    )


def _build_exam_prompt(config: ExamGenerateRequest, book_title: str) -> str:
    chapters = ", ".join(config.chapter_ids) if config.chapter_ids else "entire book"
    return (
        f"Generate a balanced {config.num_questions}-question mock examination from '{book_title}'. "
        f"Difficulty: {config.difficulty}. Chapters: {chapters}. Style: {config.exam_style}. "
        "Include a mix of recall, application, and clinical scenario questions with even topic distribution."
    )


def generate_quiz(book: dict, rag: BookRAG, config: QuizGenerateRequest) -> dict:
    chapter_filter = config.chapter_ids[0] if len(config.chapter_ids) == 1 else None
    prompt = _build_quiz_prompt(config, book["title"])
    raw_questions = rag.generate_questions(prompt, config.num_questions, chapter_filter)

    questions = []
    for idx, q in enumerate(raw_questions, start=1):
        questions.append(
            {
                "id": q.get("id") or f"q{idx}",
                "type": q.get("type", "mcq"),
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "topic": q.get("topic", ""),
                "chapter": q.get("chapter", ""),
                "difficulty": q.get("difficulty", config.difficulty),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
            }
        )

    attempt_id = uuid.uuid4().hex[:12]
    _pending_attempts[attempt_id] = {
        "book_id": book["id"],
        "mode": "quiz",
        "config": config.model_dump(),
        "questions": questions,
    }
    save_attempt(
        {
            "book_id": book["id"],
            "mode": "quiz",
            "config": config.model_dump(),
            "questions": [{k: v for k, v in q.items() if k not in ("correct_answer", "explanation")} for q in questions],
            "answers": {},
        }
    )
    public_questions = [
        {k: v for k, v in q.items() if k not in ("correct_answer", "explanation")}
        for q in questions
    ]
    return {
        "attempt_id": attempt_id,
        "questions": public_questions,
        "disclaimer": DISCLAIMER,
    }


def generate_exam(book: dict, rag: BookRAG, config: ExamGenerateRequest) -> dict:
    prompt = _build_exam_prompt(config, book["title"])
    raw_questions = rag.generate_questions(prompt, config.num_questions)

    questions = []
    for idx, q in enumerate(raw_questions, start=1):
        questions.append(
            {
                "id": q.get("id") or f"q{idx}",
                "type": q.get("type", "mcq"),
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "topic": q.get("topic", "General"),
                "chapter": q.get("chapter", ""),
                "difficulty": q.get("difficulty", "medium"),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
            }
        )

    attempt_id = uuid.uuid4().hex[:12]
    _pending_attempts[attempt_id] = {
        "book_id": book["id"],
        "mode": "exam",
        "config": config.model_dump(),
        "questions": questions,
    }
    save_attempt(
        {
            "book_id": book["id"],
            "mode": "exam",
            "config": config.model_dump(),
            "questions": [{k: v for k, v in q.items() if k not in ("correct_answer", "explanation")} for q in questions],
            "answers": {},
        }
    )
    public_questions = [
        {k: v for k, v in q.items() if k not in ("correct_answer", "explanation")}
        for q in questions
    ]
    return {
        "attempt_id": attempt_id,
        "questions": public_questions,
        "time_limit_minutes": config.time_limit_minutes,
        "disclaimer": DISCLAIMER,
    }


def _normalize_answer(value: str) -> str:
    return str(value or "").strip().lower()


def evaluate_submission(payload: QuizSubmitRequest) -> dict:
    pending = _pending_attempts.get(payload.attempt_id)
    if not pending:
        raise ValueError("Quiz session expired or not found. Please generate a new quiz.")

    questions = pending["questions"]
    results = []
    topic_stats: dict[str, dict[str, int]] = {}

    for q in questions:
        user_answer = payload.answers.get(q["id"], "")
        correct_answer = q.get("correct_answer", "")
        correct = _normalize_answer(user_answer) == _normalize_answer(correct_answer)
        if q.get("type") == "mcq" and not correct:
            # allow matching by option letter or full option text
            opts = q.get("options", [])
            for opt in opts:
                if _normalize_answer(opt) == _normalize_answer(user_answer):
                    if _normalize_answer(opt) == _normalize_answer(correct_answer) or _normalize_answer(correct_answer) in _normalize_answer(opt):
                        correct = True
                    break
                if opt.lower().startswith(f"{_normalize_answer(user_answer)})") and _normalize_answer(correct_answer) in _normalize_answer(opt):
                    correct = True
                    break

        topic = q.get("topic") or "General"
        topic_stats.setdefault(topic, {"correct": 0, "total": 0})
        topic_stats[topic]["total"] += 1
        if correct:
            topic_stats[topic]["correct"] += 1

        results.append(
            {
                "id": q["id"],
                "correct": correct,
                "user_answer": user_answer,
                "correct_answer": correct_answer,
                "explanation": q.get("explanation", ""),
                "topic": topic,
            }
        )

    total = len(questions)
    correct_count = sum(1 for r in results if r["correct"])
    percentage = round((correct_count / total) * 100, 1) if total else 0.0

    topic_breakdown = [
        {
            "topic": topic,
            "correct": stats["correct"],
            "total": stats["total"],
            "percentage": round((stats["correct"] / stats["total"]) * 100, 1),
        }
        for topic, stats in topic_stats.items()
    ]
    topic_breakdown.sort(key=lambda x: x["percentage"])

    strengths = [t["topic"] for t in topic_breakdown if t["percentage"] >= 75][-3:]
    weaknesses = [t["topic"] for t in topic_breakdown if t["percentage"] < 60][:5]
    recommendations = []
    if weaknesses:
        recommendations.append(f"Review chapters covering: {', '.join(weaknesses[:3])}.")
    if percentage < 60:
        recommendations.append("Repeat a focused quiz on weak topics before attempting exam mode.")
    elif percentage < 80:
        recommendations.append("Good progress — use revision notes and flashcards on weaker areas.")
    else:
        recommendations.append("Strong performance — attempt a full exam to validate readiness.")
    readiness = (
        "Needs significant review" if percentage < 50 else
        "Developing" if percentage < 70 else
        "Exam-ready with minor gaps" if percentage < 85 else
        "Strong readiness"
    )

    analytics = {
        "topic_breakdown": topic_breakdown,
        "strengths": strengths or ["Consistent performance across topics"],
        "weaknesses": weaknesses or ["No major weak areas identified"],
        "recommendations": recommendations,
        "readiness_level": readiness,
        "duration_seconds": payload.duration_seconds,
    }

    save_attempt(
        {
            "book_id": pending["book_id"],
            "mode": pending["mode"],
            "config": pending["config"],
            "questions": [{k: v for k, v in q.items() if k not in ("correct_answer", "explanation")} for q in questions],
            "answers": payload.answers,
            "score": float(correct_count),
            "percentage": percentage,
            "analytics": analytics,
            "duration_seconds": payload.duration_seconds,
        }
    )
    _pending_attempts.pop(payload.attempt_id, None)

    return {
        "score": float(correct_count),
        "percentage": percentage,
        "total": total,
        "correct": correct_count,
        "results": results,
        **analytics,
        "disclaimer": DISCLAIMER,
    }


def build_analytics(book_id: str, attempts: list[dict]) -> dict:
    if not attempts:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "best_score": 0,
            "recent_trend": [],
            "topic_mastery": [],
            "recommendations": ["Upload a book and complete a quiz to see analytics."],
        }

    scored = [a for a in attempts if a.get("percentage") is not None]
    avg = round(sum(a["percentage"] for a in scored) / len(scored), 1) if scored else 0
    best = max((a["percentage"] for a in scored), default=0)
    recent = [
        {"date": a["created_at"][:10], "percentage": a["percentage"], "mode": a["mode"]}
        for a in scored[:8]
    ]

    topic_totals: dict[str, list[float]] = {}
    for attempt in scored:
        for item in attempt.get("analytics", {}).get("topic_breakdown", []):
            topic_totals.setdefault(item["topic"], []).append(item["percentage"])

    topic_mastery = [
        {
            "topic": topic,
            "average": round(sum(vals) / len(vals), 1),
            "attempts": len(vals),
        }
        for topic, vals in topic_totals.items()
    ]
    topic_mastery.sort(key=lambda x: x["average"])

    return {
        "total_attempts": len(scored),
        "average_score": avg,
        "best_score": best,
        "recent_trend": recent,
        "topic_mastery": topic_mastery,
        "recommendations": [
            "Focus revision on lowest-scoring topics." if topic_mastery and topic_mastery[0]["average"] < 70 else
            "Maintain momentum with periodic exam simulations.",
        ],
    }
