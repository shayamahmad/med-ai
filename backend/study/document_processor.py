"""Extract and chunk uploaded study documents."""

import re
import uuid
from pathlib import Path

import fitz

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
SUPPORTED = {".pdf", ".txt", ".md"}


def extract_pdf_pages(pdf_path: Path) -> list[dict]:
    doc = fitz.open(str(pdf_path))
    pages: list[dict] = []
    for index, page in enumerate(doc):
        raw = page.get_text("text")
        lines = [line.strip() for line in raw.splitlines() if len(line.strip()) > 15]
        text = "\n".join(lines).strip()
        if text:
            pages.append({"page": index + 1, "text": text})
    doc.close()
    return pages


def extract_text_file(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if text.startswith("SOURCE URL:"):
        text = "\n".join(text.splitlines()[3:])
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 40]
    if not paragraphs:
        return [{"page": 1, "text": text.strip()}] if text.strip() else []
    page_size = max(1, len(paragraphs) // max(1, len(text) // 3000))
    pages: list[dict] = []
    for i in range(0, len(paragraphs), page_size):
        chunk = "\n\n".join(paragraphs[i : i + page_size])
        pages.append({"page": len(pages) + 1, "text": chunk})
    return pages


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    if not text or not text.strip():
        return []
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = start + chunk_size
        if end >= length:
            chunk = text[start:].strip()
            if len(chunk) > 50:
                chunks.append(chunk)
            break
        boundary = -1
        for punct in (". ", "! ", "? ", "\n\n"):
            pos = text.rfind(punct, start + chunk_size - 150, end)
            if pos != -1 and pos > boundary:
                boundary = pos + len(punct)
        if boundary != -1:
            end = boundary
        chunk = text[start:end].strip()
        if len(chunk) > 50:
            chunks.append(chunk)
        start = end - overlap
    return chunks


def detect_chapters(pages: list[dict]) -> list[dict]:
    chapters: list[dict] = []
    chapter_pattern = re.compile(
        r"^(?:chapter|unit|section|part)\s+(\d+|[ivxlc]+)\s*[:\-.]?\s*(.+)$",
        re.IGNORECASE,
    )
    current = {"id": "intro", "title": "Introduction", "start_page": pages[0]["page"] if pages else 1, "end_page": pages[-1]["page"] if pages else 1}

    for page in pages:
        first_lines = page["text"].splitlines()[:3]
        matched = None
        for line in first_lines:
            m = chapter_pattern.match(line.strip())
            if m:
                matched = m.group(2).strip() or f"Chapter {m.group(1)}"
                break
        if matched:
            if chapters or current["title"] != "Introduction":
                current["end_page"] = max(page["page"] - 1, current["start_page"])
                chapters.append(current)
            current = {
                "id": f"chapter-{len(chapters) + 1}",
                "title": matched[:120],
                "start_page": page["page"],
                "end_page": page["page"],
            }
        else:
            current["end_page"] = page["page"]

    chapters.append(current)

    if len(chapters) <= 1 and len(pages) > 20:
        chapters = []
        group = max(8, len(pages) // 8)
        for i in range(0, len(pages), group):
            block = pages[i : i + group]
            chapters.append(
                {
                    "id": f"section-{len(chapters) + 1}",
                    "title": f"Section {len(chapters) + 1} (pp. {block[0]['page']}-{block[-1]['page']})",
                    "start_page": block[0]["page"],
                    "end_page": block[-1]["page"],
                }
            )
    return chapters


def build_book_chunks(pages: list[dict], book_id: str, book_title: str) -> tuple[list[str], list[dict], list[str]]:
    chapters = detect_chapters(pages)
    texts: list[str] = []
    metadatas: list[dict] = []
    ids: list[str] = []

    for page in pages:
        page_num = page["page"]
        chapter = next(
            (c for c in chapters if c["start_page"] <= page_num <= c["end_page"]),
            chapters[0] if chapters else {"id": "all", "title": book_title, "start_page": page_num, "end_page": page_num},
        )
        for idx, chunk in enumerate(chunk_text(page["text"])):
            chunk_id = f"{book_id}_{page_num}_{idx}_{uuid.uuid4().hex[:6]}"
            texts.append(chunk)
            metadatas.append(
                {
                    "book_id": book_id,
                    "book_title": book_title,
                    "chapter_id": chapter["id"],
                    "chapter": chapter["title"],
                    "page": page_num,
                    "chunk_index": idx,
                }
            )
            ids.append(chunk_id)
    return texts, metadatas, ids, chapters


def process_uploaded_file(file_path: Path, book_id: str, book_title: str) -> dict:
    suffix = file_path.suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError(f"Unsupported file type: {suffix}")

    if suffix == ".pdf":
        pages = extract_pdf_pages(file_path)
    else:
        pages = extract_text_file(file_path)

    if not pages:
        raise ValueError("No readable text found in document.")

    texts, metadatas, ids, chapters = build_book_chunks(pages, book_id, book_title)
    if not texts:
        raise ValueError("Document produced no indexable chunks.")

    return {
        "pages": pages,
        "texts": texts,
        "metadatas": metadatas,
        "ids": ids,
        "chapters": chapters,
        "page_count": len(pages),
        "chunk_count": len(texts),
    }
