import os
import re
import sys
import uuid
import argparse
from pathlib import Path

import fitz          # PyMuPDF  — pip install PyMuPDF
from tqdm import tqdm

from rag_system import MedicalRAG


# ================================================================
# CONFIGURATION — edit these paths to match your folder structure
# ================================================================

# Root folder containing all your downloaded medical sources
SOURCES_ROOT = Path("./medical_sources")

# Sub-folders and the metadata "source" label for each
SOURCE_FOLDERS = {
    "textsbooks": "Medical Textbook",   # Harrison's, Davidson's, Robbins, Guyton, Oxford
    "who_pdfs":   "WHO Guidelines",     # WHO TB, CVD, Diabetes, Cancer PDFs
    "cdc_pdf":    "CDC Guidelines",     # CDC PDF
}

# Chunking settings
CHUNK_SIZE    = 600   # characters per chunk (≈ 120 words)
CHUNK_OVERLAP = 100   # overlap between chunks to preserve context


# ================================================================
# TEXT EXTRACTION
# ================================================================

def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extract all text from a PDF using PyMuPDF.
    Handles multi-column layouts and removes header/footer noise.
    """
    try:
        doc  = fitz.open(str(pdf_path))
        pages = []
        for page in doc:
            text = page.get_text("text")
            # Remove lines that are just page numbers or very short
            lines = [
                line.strip()
                for line in text.splitlines()
                if len(line.strip()) > 20
            ]
            pages.append("\n".join(lines))
        doc.close()
        full_text = "\n\n".join(pages)
        return full_text
    except Exception as e:
        print(f"  ❌ PDF read error {pdf_path.name}: {e}")
        return ""


def extract_text_from_txt(txt_path: Path) -> str:
    """Read a plain text file."""
    try:
        text = txt_path.read_text(encoding="utf-8", errors="ignore")
        # Strip the "SOURCE URL: ..." header added by the downloader
        if text.startswith("SOURCE URL:"):
            lines = text.splitlines()
            # Skip first 3 lines (URL + separator + blank)
            text = "\n".join(lines[3:])
        return text
    except Exception as e:
        print(f"  ❌ TXT read error {txt_path.name}: {e}")
        return ""


# ================================================================
# CHUNKING
# ================================================================

def chunk_text(
    text:         str,
    chunk_size:   int = CHUNK_SIZE,
    overlap:      int = CHUNK_OVERLAP,
) -> list[str]:
    """
    Split text into overlapping chunks.
    Tries to split on sentence boundaries (. ! ?) for cleaner chunks.
    """
    if not text or not text.strip():
        return []

    # Normalize whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)

    chunks  = []
    start   = 0
    length  = len(text)

    while start < length:
        end = start + chunk_size

        if end >= length:
            chunk = text[start:].strip()
            if len(chunk) > 50:        # skip tiny trailing fragments
                chunks.append(chunk)
            break

        # Try to end at a sentence boundary within the last 150 chars
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

        start = end - overlap   # slide window with overlap

    return chunks


# ================================================================
# METADATA EXTRACTION (from filename)
# ================================================================

def guess_topic_from_filename(filename: str) -> str:
    """
    Try to extract a human-readable topic from the file name.
    e.g. "who_tb_guidelines.pdf" → "Tuberculosis"
         "sp_diabetes_type2.txt" → "Diabetes Type 2"
    """
    name = Path(filename).stem

    # Remove common prefixes
    for prefix in ("who_", "cdc_", "sp_", "mlp_", "mlp", "cdc"):
        if name.startswith(prefix):
            name = name[len(prefix):]
            break

    # Replace underscores/hyphens with spaces and title-case
    topic = name.replace("_", " ").replace("-", " ").title()
    return topic


# ================================================================
# INGEST ONE FILE
# ================================================================

def ingest_file(
    file_path:   Path,
    source_label: str,
    rag:         MedicalRAG,
) -> int:
    """
    Extract text from a single file, chunk it, and add to ChromaDB.
    Returns number of chunks added.
    """
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        raw_text = extract_text_from_pdf(file_path)
    elif suffix in (".txt", ".md"):
        raw_text = extract_text_from_txt(file_path)
    else:
        print(f"  ⏭️  Skipping unsupported format: {file_path.name}")
        return 0

    if not raw_text or len(raw_text.strip()) < 100:
        print(f"  ⚠️  No usable text in: {file_path.name}")
        return 0

    chunks = chunk_text(raw_text)
    if not chunks:
        print(f"  ⚠️  No chunks produced from: {file_path.name}")
        return 0

    topic      = guess_topic_from_filename(file_path.name)
    book_name  = file_path.stem.replace("_", " ").title()

    texts     = []
    metadatas = []
    ids       = []

    for i, chunk in enumerate(chunks):
        # Unique ID: source + filename hash + chunk index
        chunk_id = f"{file_path.stem}_{i}_{uuid.uuid4().hex[:6]}"

        texts.append(chunk)
        metadatas.append({
            "source":   source_label,
            "book":     book_name,
            "topic":    topic,
            "filename": file_path.name,
            "chunk_i":  i,
        })
        ids.append(chunk_id)

    rag.add_documents(texts, metadatas, ids)
    return len(chunks)


# ================================================================
# INGEST ALL FILES
# ================================================================

def ingest_all(rag: MedicalRAG):
    """Walk through all source folders and ingest every PDF/TXT file."""

    if not SOURCES_ROOT.exists():
        print(f"\n❌  Sources folder not found: {SOURCES_ROOT.resolve()}")
        print("   Create it and put your PDFs in sub-folders:")
        for folder, label in SOURCE_FOLDERS.items():
            print(f"     {SOURCES_ROOT}/{folder}/   ({label})")
        sys.exit(1)

    total_files  = 0
    total_chunks = 0
    skipped      = 0

    for folder_name, source_label in SOURCE_FOLDERS.items():
        folder_path = SOURCES_ROOT / folder_name

        if not folder_path.exists():
            print(f"\n📂  Folder not found (skipping): {folder_path}")
            continue

        files = sorted(
            [f for f in folder_path.iterdir()
             if f.suffix.lower() in (".pdf", ".txt", ".md")]
        )

        if not files:
            print(f"\n📂  {folder_name}/ — no files found")
            continue

        print(f"\n{'='*60}")
        print(f"📂  {folder_name}/  ({source_label})  —  {len(files)} files")
        print(f"{'='*60}")

        for file_path in tqdm(files, desc=f"  {folder_name}", unit="file"):
            print(f"\n  📄  {file_path.name}")
            n = ingest_file(file_path, source_label, rag)
            if n > 0:
                total_chunks += n
                total_files  += 1
                print(f"      ✅  {n} chunks added")
            else:
                skipped += 1

    print(f"\n{'='*60}")
    print(f"   INGESTION COMPLETE")
    print(f"   Files processed : {total_files}")
    print(f"   Files skipped   : {skipped}")
    print(f"   Total chunks    : {total_chunks}")
    print(f"   DB total now    : {rag.collection.count()}")
    print(f"{'='*60}")


# ================================================================
# VERIFY — quick test query after ingestion
# ================================================================

def run_test_queries(rag: MedicalRAG):
    """Run a few test queries to verify the knowledge base is working."""
    test_queries = [
        ("Tuberculosis symptoms and treatment",  "disease"),
        ("How does the heart pump blood",        "organ"),
        ("Type 2 diabetes management",           "tutor"),
    ]

    print(f"\n{'='*60}")
    print("🧪  RUNNING TEST QUERIES")
    print(f"{'='*60}")

    for question, mode in test_queries:
        print(f"\n❓  {question}")
        result = rag.query(question=question, mode=mode, max_tokens=300)
        print(f"{result['answer'][:400]}{'...' if len(result['answer']) > 400 else ''}")
        print(f"Sources: {result['sources']}")
        print(f"Chunks used: {result['chunks_used']}")


# ================================================================
# MAIN
# ================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Medical RAG Knowledge Base Ingestion Tool"
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear the existing ChromaDB collection before ingesting",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show current DB stats and exit",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run test queries after ingestion",
    )
    parser.add_argument(
        "--folder",
        type=str,
        default=None,
        help="Ingest only a specific sub-folder (e.g. --folder who_pdfs)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print(" MEDICAL RAG — INGESTION PIPELINE")
    print("=" * 60)

    # Init RAG
    rag = MedicalRAG()

    # Stats only
    if args.stats:
        stats = rag.get_stats()
        print(f"\nKnowledge Base Stats:")
        for k, v in stats.items():
            print(f"   {k}: {v}")
        return

    # Optionally clear first
    if args.clear:
        confirm = input("\nThis will DELETE all existing chunks. Confirm? (yes/no): ")
        if confirm.strip().lower() == "yes":
            rag.clear_collection()
            print("✅  Collection cleared.")
        else:
            print("Cancelled.")
            return

    # Ingest specific folder or everything
    if args.folder:
        folder_path = SOURCES_ROOT / args.folder
        label       = SOURCE_FOLDERS.get(args.folder, args.folder)
        if not folder_path.exists():
            print(f"Folder not found: {folder_path}")
            sys.exit(1)
        files = sorted(
            [f for f in folder_path.iterdir()
             if f.suffix.lower() in (".pdf", ".txt", ".md")]
        )
        print(f"\n📂  Ingesting {len(files)} files from {args.folder}/")
        for f in tqdm(files):
            ingest_file(f, label, rag)
    else:
        ingest_all(rag)

    # Optional test
    if args.test:
        if rag.collection.count() > 0:
            run_test_queries(rag)
        else:
            print("\nKB is empty — cannot run tests.")

    print("\n Done! Your RAG system is ready.")
    print("   Import MedicalRAG in your backend and start querying.")


if __name__ == "__main__":
    main()