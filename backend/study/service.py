"""Study Companion orchestration service."""

import logging
from pathlib import Path

from study.book_rag import BookRAG, DISCLAIMER
from study.db import UPLOADS_DIR, book_exists, create_book, delete_book, get_book, list_attempts, list_books, update_book
from study.document_processor import SUPPORTED, process_uploaded_file
from study.quiz_engine import (
    build_analytics,
    evaluate_submission,
    generate_exam,
    generate_quiz,
)
from study.schemas import ExamGenerateRequest, QuizGenerateRequest, QuizSubmitRequest, StudyToolRequest

logger = logging.getLogger(__name__)

_rag_cache: dict[str, BookRAG] = {}


class ProcessingCancelled(Exception):
    """Raised when a book is deleted while indexing is in progress."""


def get_book_rag(book: dict) -> BookRAG:
    name = book["collection_name"]
    if name not in _rag_cache:
        _rag_cache[name] = BookRAG(name)
    return _rag_cache[name]


def _ensure_book_active(book_id: str) -> None:
    if not book_exists(book_id):
        raise ProcessingCancelled()


def process_book_upload(book_id: str, saved_path: Path) -> None:
    book = get_book(book_id)
    if not book:
        return
    try:
        _ensure_book_active(book_id)
        update_book(book_id, status="processing", progress=0.1)
        result = process_uploaded_file(saved_path, book_id, book["title"])
        _ensure_book_active(book_id)
        update_book(book_id, progress=0.45, page_count=result["page_count"])

        rag = get_book_rag(book)
        try:
            rag.delete_collection()
        except Exception as exc:
            logger.warning("[Study] Could not clear collection for %s: %s", book_id, exc)
        _rag_cache.pop(book["collection_name"], None)
        rag = get_book_rag(book)

        def on_index_progress(value: float) -> None:
            _ensure_book_active(book_id)
            update_book(book_id, progress=round(value, 3))

        rag.index_chunks(
            result["texts"],
            result["metadatas"],
            result["ids"],
            progress_callback=on_index_progress,
        )
        _ensure_book_active(book_id)
        update_book(
            book_id,
            status="ready",
            progress=1.0,
            chunk_count=result["chunk_count"],
            page_count=result["page_count"],
            chapters_json=result["chapters"],
            error_message=None,
        )
        logger.info("[Study] Book '%s' indexed with %s chunks", book["title"], result["chunk_count"])
    except ProcessingCancelled:
        logger.info("[Study] Processing cancelled for deleted book %s", book_id)
    except Exception as exc:
        logger.exception("[Study] Processing failed for %s: %s", book_id, exc)
        if book_exists(book_id):
            update_book(book_id, status="failed", progress=0.0, error_message=str(exc))


def register_upload(filename: str, file_bytes: bytes) -> dict:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError(f"Unsupported format. Allowed: {', '.join(sorted(SUPPORTED))}")

    title = Path(filename).stem.replace("_", " ").replace("-", " ").title()
    book = create_book(filename, title, suffix.lstrip("."))
    book_dir = UPLOADS_DIR / book["id"]
    book_dir.mkdir(parents=True, exist_ok=True)
    saved_path = book_dir / filename
    saved_path.write_bytes(file_bytes)
    return {"book": get_book(book["id"]), "saved_path": saved_path}


def remove_book(book_id: str) -> bool:
    """Delete a book and its vector index. Idempotent if already removed."""
    book = get_book(book_id)
    if book:
        try:
            rag = get_book_rag(book)
            rag.delete_collection()
        except Exception as exc:
            logger.warning("[Study] Collection cleanup failed for %s: %s", book_id, exc)
        _rag_cache.pop(book["collection_name"], None)
    delete_book(book_id)
    return True


def chat_with_book(book_id: str, message: str, history: list[dict], chapter_id: str | None = None) -> dict:
    book = _require_ready_book(book_id)
    rag = get_book_rag(book)
    return rag.chat(message, history, chapter_id)


def create_quiz(book_id: str, config: QuizGenerateRequest) -> dict:
    book = _require_ready_book(book_id)
    return generate_quiz(book, get_book_rag(book), config)


def create_exam(book_id: str, config: ExamGenerateRequest) -> dict:
    book = _require_ready_book(book_id)
    return generate_exam(book, get_book_rag(book), config)


def submit_assessment(payload: QuizSubmitRequest) -> dict:
    return evaluate_submission(payload)


def get_book_analytics(book_id: str) -> dict:
    book = get_book(book_id)
    if not book:
        raise ValueError("Book not found")
    attempts = list_attempts(book_id)
    return build_analytics(book_id, attempts)


def run_study_tool(book_id: str, tool: str, payload: StudyToolRequest) -> dict:
    book = _require_ready_book(book_id)
    rag = get_book_rag(book)
    request = payload.topic or payload.chapter_id or book["title"]
    content = rag.study_tool(tool, request, payload.chapter_id)
    return {"tool": tool, "content": content, "disclaimer": DISCLAIMER}


def _require_ready_book(book_id: str) -> dict:
    book = get_book(book_id)
    if not book:
        raise ValueError("Book not found")
    if book["status"] != "ready":
        raise ValueError(f"Book is not ready yet (status: {book['status']}).")
    return book


def list_library() -> list[dict]:
    return list_books()
