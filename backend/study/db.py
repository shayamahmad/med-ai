"""SQLite persistence for study books, attempts, and sessions."""

import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "study_uploads"
DB_PATH = DATA_DIR / "study.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS study_books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
    progress REAL NOT NULL DEFAULT 0,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    page_count INTEGER NOT NULL DEFAULT 0,
    chapters_json TEXT NOT NULL DEFAULT '[]',
    collection_name TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_attempts (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    config_json TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    answers_json TEXT,
    score REAL,
    percentage REAL,
    analytics_json TEXT,
    duration_seconds INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES study_books(id)
);

CREATE TABLE IF NOT EXISTS study_chat_sessions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    title TEXT NOT NULL,
    messages_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES study_books(id)
);

CREATE TABLE IF NOT EXISTS study_bookmarks (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES study_books(id)
);

CREATE INDEX IF NOT EXISTS idx_study_books_status ON study_books(status);
CREATE INDEX IF NOT EXISTS idx_study_attempts_book ON study_attempts(book_id);
"""


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_study_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)
        _recover_stuck_books(conn)
    logger.info("[Study] Database ready at %s", DB_PATH)


def _recover_stuck_books(conn: sqlite3.Connection) -> None:
    """Mark books left in 'processing' as failed after a crash or hung server."""
    conn.execute(
        """
        UPDATE study_books
        SET status = 'failed',
            error_message = 'Processing interrupted - please upload again.',
            updated_at = ?
        WHERE status = 'processing'
        """,
        (_now(),),
    )


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_book(filename: str, title: str, file_type: str) -> dict:
    book_id = uuid.uuid4().hex[:12]
    now = _now()
    collection_name = f"study_book_{book_id}"
    row = {
        "id": book_id,
        "title": title,
        "filename": filename,
        "file_type": file_type,
        "status": "processing",
        "progress": 0.0,
        "chunk_count": 0,
        "page_count": 0,
        "chapters_json": "[]",
        "collection_name": collection_name,
        "error_message": None,
        "created_at": now,
        "updated_at": now,
    }
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO study_books (
                id, title, filename, file_type, status, progress, chunk_count,
                page_count, chapters_json, collection_name, error_message,
                created_at, updated_at
            ) VALUES (
                :id, :title, :filename, :file_type, :status, :progress, :chunk_count,
                :page_count, :chapters_json, :collection_name, :error_message,
                :created_at, :updated_at
            )
            """,
            row,
        )
    return row


def update_book(book_id: str, **fields) -> None:
    fields["updated_at"] = _now()
    if "chapters_json" in fields and isinstance(fields["chapters_json"], list):
        fields["chapters_json"] = json.dumps(fields["chapters_json"])
    cols = ", ".join(f"{k}=:{k}" for k in fields)
    fields["book_id"] = book_id
    with _connect() as conn:
        conn.execute(f"UPDATE study_books SET {cols} WHERE id=:book_id", fields)


def get_book(book_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM study_books WHERE id=?", (book_id,)).fetchone()
    return _book_row(row) if row else None


def list_books() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM study_books ORDER BY created_at DESC"
        ).fetchall()
    return [_book_row(r) for r in rows]


def delete_book(book_id: str) -> bool:
    with _connect() as conn:
        cur = conn.execute("DELETE FROM study_books WHERE id=?", (book_id,))
        deleted = cur.rowcount > 0
        conn.execute("DELETE FROM study_attempts WHERE book_id=?", (book_id,))
        conn.execute("DELETE FROM study_chat_sessions WHERE book_id=?", (book_id,))
        conn.execute("DELETE FROM study_bookmarks WHERE book_id=?", (book_id,))
    upload_dir = UPLOADS_DIR / book_id
    if upload_dir.exists():
        for f in upload_dir.iterdir():
            f.unlink(missing_ok=True)
        upload_dir.rmdir()
    return deleted


def book_exists(book_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM study_books WHERE id=? LIMIT 1",
            (book_id,),
        ).fetchone()
    return row is not None


def save_attempt(data: dict) -> dict:
    attempt_id = uuid.uuid4().hex[:12]
    row = {
        "id": attempt_id,
        "book_id": data["book_id"],
        "mode": data["mode"],
        "config_json": json.dumps(data.get("config", {})),
        "questions_json": json.dumps(data.get("questions", [])),
        "answers_json": json.dumps(data.get("answers", {})),
        "score": data.get("score"),
        "percentage": data.get("percentage"),
        "analytics_json": json.dumps(data.get("analytics", {})),
        "duration_seconds": data.get("duration_seconds"),
        "created_at": _now(),
    }
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO study_attempts (
                id, book_id, mode, config_json, questions_json, answers_json,
                score, percentage, analytics_json, duration_seconds, created_at
            ) VALUES (
                :id, :book_id, :mode, :config_json, :questions_json, :answers_json,
                :score, :percentage, :analytics_json, :duration_seconds, :created_at
            )
            """,
            row,
        )
    return row


def list_attempts(book_id: str, mode: str | None = None) -> list[dict]:
    query = "SELECT * FROM study_attempts WHERE book_id=?"
    params: list = [book_id]
    if mode:
        query += " AND mode=?"
        params.append(mode)
    query += " ORDER BY created_at DESC"
    with _connect() as conn:
        rows = conn.execute(query, params).fetchall()
    results = []
    for row in rows:
        results.append(
            {
                "id": row["id"],
                "book_id": row["book_id"],
                "mode": row["mode"],
                "config": json.loads(row["config_json"]),
                "score": row["score"],
                "percentage": row["percentage"],
                "analytics": json.loads(row["analytics_json"] or "{}"),
                "duration_seconds": row["duration_seconds"],
                "created_at": row["created_at"],
            }
        )
    return results


def _book_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "filename": row["filename"],
        "file_type": row["file_type"],
        "status": row["status"],
        "progress": row["progress"],
        "chunk_count": row["chunk_count"],
        "page_count": row["page_count"],
        "chapters": json.loads(row["chapters_json"] or "[]"),
        "collection_name": row["collection_name"],
        "error_message": row["error_message"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
