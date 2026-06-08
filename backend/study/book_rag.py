"""Per-book ChromaDB RAG engine."""

import json
import logging
import os
import re
from typing import Any

import chromadb
from chromadb.config import Settings
from mistralai.client import Mistral

from study.embeddings import get_embedder

logger = logging.getLogger(__name__)

DISCLAIMER = (
    "For educational purposes only. Responses are grounded in your uploaded material "
    "but may contain errors. Always verify with your textbook and instructors."
)

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "chromadb_study")
# ChromaDB caps upsert batch size (~5461 records); stay safely below.
CHROMA_UPSERT_BATCH = 4000
EMBED_ENCODE_BATCH = 64


class BookRAG:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name
        self.client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        self.embedder = get_embedder()
        mistral_key = os.environ.get("MISTRAL_API_KEY", "").strip()
        self.mistral = Mistral(api_key=mistral_key) if mistral_key and not mistral_key.startswith("your_") else None

    def index_chunks(
        self,
        texts: list[str],
        metadatas: list[dict],
        ids: list[str],
        progress_callback=None,
    ) -> None:
        if not texts:
            return
        total = len(texts)
        logger.info("[Study] Indexing %s chunks in batches of %s", total, CHROMA_UPSERT_BATCH)
        for start in range(0, total, CHROMA_UPSERT_BATCH):
            end = min(start + CHROMA_UPSERT_BATCH, total)
            batch_texts = texts[start:end]
            embeddings = self.embedder.encode(
                batch_texts,
                show_progress_bar=False,
                batch_size=EMBED_ENCODE_BATCH,
            ).tolist()
            self.collection.upsert(
                documents=batch_texts,
                embeddings=embeddings,
                metadatas=metadatas[start:end],
                ids=ids[start:end],
            )
            if progress_callback:
                # Map indexing progress into 0.45–0.95 of overall job
                progress_callback(0.45 + (end / total) * 0.5)
            logger.info("[Study] Indexed %s/%s chunks", end, total)

    def delete_collection(self) -> None:
        try:
            self.client.delete_collection(self.collection_name)
        except Exception:
            pass

    def retrieve_chapter_chunks(self, chapter_id: str, limit: int = 20) -> list[dict]:
        """Return a spread of chunks from one chapter (not semantic search)."""
        if self.collection.count() == 0:
            return []
        res = self.collection.get(
            where={"chapter_id": chapter_id},
            include=["documents", "metadatas"],
        )
        docs = res.get("documents") or []
        metas = res.get("metadatas") or []
        if not docs:
            return []

        paired = list(zip(docs, metas))
        paired.sort(key=lambda item: (item[1].get("page", 0), item[1].get("chunk_index", 0)))
        if len(paired) <= limit:
            selected = paired
        else:
            step = len(paired) / limit
            selected = [paired[int(i * step)] for i in range(limit)]

        chunks = []
        for text, meta in selected:
            chunks.append({"text": text, "metadata": meta, "score": 1.0})
        return chunks

    def retrieve(
        self,
        query: str,
        n_results: int = 8,
        chapter_id: str | None = None,
    ) -> list[dict]:
        if self.collection.count() == 0:
            return []
        query_emb = self.embedder.encode([query]).tolist()
        kwargs: dict[str, Any] = {
            "query_embeddings": query_emb,
            "n_results": min(n_results, self.collection.count()),
            "include": ["documents", "metadatas", "distances"],
        }
        if chapter_id:
            kwargs["where"] = {"chapter_id": chapter_id}
        res = self.collection.query(**kwargs)
        chunks = []
        for i in range(len(res["documents"][0])):
            meta = res["metadatas"][0][i]
            chunks.append(
                {
                    "text": res["documents"][0][i],
                    "metadata": meta,
                    "score": round(1 - res["distances"][0][i], 3),
                }
            )
        return sorted(chunks, key=lambda c: c["score"], reverse=True)

    def build_context(self, chunks: list[dict]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            meta = chunk["metadata"]
            header = f"[Source {i} | {meta.get('chapter', 'Section')} | p.{meta.get('page', '?')}]"
            parts.append(f"{header}\n{chunk['text']}")
        return "\n\n---\n\n".join(parts)

    def _require_mistral(self):
        if self.mistral is None:
            raise RuntimeError("MISTRAL_API_KEY not set. Add it to .env and restart the backend.")

    def chat(
        self,
        message: str,
        history: list[dict] | None = None,
        chapter_id: str | None = None,
    ) -> dict:
        self._require_mistral()
        chunks = self.retrieve(message, n_results=8, chapter_id=chapter_id)
        context = self.build_context(chunks)
        system = f"""You are MedStudy AI, a personal medical tutor who has read the student's uploaded textbook.
Answer ONLY using the provided book excerpts. If the answer is not in the context, say so clearly.
Cite chapter and page references inline like (Chapter X, p.Y).
Explain clearly for exam preparation. You may summarize, compare topics, create mnemonics, and simplify concepts.
Never provide patient-specific medical advice or medication dosages.

BOOK EXCERPTS:
{context if chunks else 'No relevant excerpts retrieved.'}"""

        messages = [{"role": "system", "content": system}]
        if history:
            for turn in history[-8:]:
                if turn.get("role") in ("user", "assistant"):
                    messages.append({"role": turn["role"], "content": str(turn["content"])})
        messages.append({"role": "user", "content": message})

        response = self.mistral.chat.complete(
            model=os.environ.get("MISTRAL_MODEL", "mistral-small-latest"),
            messages=messages,
            max_tokens=1200,
        )
        answer = response.choices[0].message.content
        citations = [
            {
                "chapter": c["metadata"].get("chapter", ""),
                "page": c["metadata"].get("page"),
                "score": c["score"],
            }
            for c in chunks[:5]
            if c["score"] >= 0.25
        ]
        return {"answer": answer, "citations": citations, "disclaimer": DISCLAIMER}

    def _merge_chunks(self, *chunk_lists: list[list[dict]]) -> list[dict]:
        seen: set[str] = set()
        merged: list[dict] = []
        for chunk_list in chunk_lists:
            for chunk in chunk_list:
                key = chunk["text"][:120]
                if key in seen:
                    continue
                seen.add(key)
                merged.append(chunk)
        return merged

    def generate_questions(
        self,
        prompt: str,
        num_questions: int,
        chapter_filter: str | None = None,
        chapter_title: str | None = None,
    ) -> list[dict]:
        self._require_mistral()
        if chapter_filter:
            search_query = (
                f"{chapter_title or chapter_filter} key concepts definitions mechanisms "
                "physiology pathophysiology clinical correlations exam review"
            )
            chunks = self._merge_chunks(
                self.retrieve_chapter_chunks(chapter_filter, limit=18),
                self.retrieve(search_query, n_results=10, chapter_id=chapter_filter),
            )
            if not chunks:
                raise ValueError(
                    f"No indexed content found for chapter '{chapter_title or chapter_filter}'. "
                    "Try re-uploading the book or choose another chapter."
                )
            scope_rule = (
                f"Every question MUST test content from the chapter \"{chapter_title or chapter_filter}\" ONLY. "
                "Do NOT ask about textbook structure, preface, publication details, website links, "
                "or generic 'textbook features'."
            )
            topic_hint = chapter_title or chapter_filter
        else:
            chunks = self.retrieve(
                "medical physiology anatomy pathology key concepts definitions mechanisms exam",
                n_results=14,
            )
            scope_rule = "Cover a balanced mix of chapters from the provided excerpts."
            topic_hint = "book content"

        context = self.build_context(chunks[:20])
        system = f"""You create medical exam questions strictly from the provided textbook excerpts.
Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": "q1",
      "type": "mcq|true_false|short_answer|fill_blank|clinical_scenario",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "exact answer text or option letter",
      "explanation": "why this is correct based on the book",
      "topic": "specific subtopic within the chapter",
      "chapter": "{chapter_title or 'source chapter'}",
      "difficulty": "easy|medium|hard"
    }}
  ]
}}
Rules: educational only, no dosage questions, no patient-specific advice, {num_questions} questions.
{scope_rule}
Set each question's "topic" to a specific medical subtopic (never "Textbook Features" or similar).
Set each question's "chapter" to "{topic_hint}" when a chapter scope is given.

Question format rules (strict):
- type "mcq": MUST include exactly 4 distinct, plausible answer choices in "options". Never use True/False as MCQ options.
- type "true_false": use ONLY for declarative statements (not "What/How many..." questions). Set options to ["True", "False"].
- type "short_answer": use for numeric values, measurements, counts, or fill-in answers. Set "options" to [] and put the exact expected value in "correct_answer".
- If a question asks for a diameter, percentage, number, or specific value, use "short_answer" NOT "mcq" or "true_false".

BOOK EXCERPTS:
{context}"""
        response = self.mistral.chat.complete(
            model=os.environ.get("MISTRAL_MODEL", "mistral-small-latest"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            max_tokens=3500,
        )
        raw = response.choices[0].message.content
        raw = re.sub(r"```json|```", "", raw).strip()
        start = raw.find("{")
        end = raw.rfind("}")
        data = json.loads(raw[start : end + 1])
        return data.get("questions", [])[:num_questions]

    def study_tool(self, tool: str, request: str, chapter_id: str | None = None) -> str:
        self._require_mistral()
        chunks = self.retrieve(request, n_results=10, chapter_id=chapter_id)
        context = self.build_context(chunks)
        prompts = {
            "summary": "Create a concise chapter summary with key headings and exam points.",
            "revision": "Create structured revision notes with bullet points and memory hooks.",
            "flashcards": "Create flashcards as Q:/A: pairs, one per line.",
            "compare": "Compare and contrast the requested topics clearly for exam prep.",
        }
        instruction = prompts.get(tool, "Help the student study this material.")
        response = self.mistral.chat.complete(
            model=os.environ.get("MISTRAL_MODEL", "mistral-small-latest"),
            messages=[
                {
                    "role": "system",
                    "content": f"{instruction}\nUse ONLY the book excerpts.\n\n{context}",
                },
                {"role": "user", "content": request},
            ],
            max_tokens=1400,
        )
        return response.choices[0].message.content
