import os
import logging

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from mistralai.client import Mistral
from env_config import load_project_env

load_project_env()

logger = logging.getLogger(__name__)


class MedicalRAG:
    """
    Full RAG engine for the Medical AI Platform.
    Stores medical knowledge from PDFs/text in ChromaDB
    and retrieves relevant context for every AI text response.

    Used by:
      - Symptom checker chat
      - Disease CNN explanation (after image detection)
      - Organ CNN explanation (after image detection)
      - AI tutor chat
      - Organ search page
      - Quiz generator
    """

    def __init__(
        self,
        chroma_path: str = "./chromadb",
        collection:  str = "medical_knowledge",
        model_name:  str = "mistral-small-latest",
        embed_model: str = "all-MiniLM-L6-v2",
    ):
        # ── ChromaDB persistent client ───────────────────────
        self.client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name=collection,
            metadata={"hnsw:space": "cosine"},
        )

        # ── Embedding model (sentence-transformers) ──────────
        logger.info("[RAG] Loading embedding model: %s", embed_model)
        self.embedder = SentenceTransformer(embed_model)

        # ── Mistral client (latest SDK) ──────────────────────
        mistral_api_key = os.environ.get("MISTRAL_API_KEY", "").strip()
        if not mistral_api_key or mistral_api_key.startswith("your_"):
            self.mistral = None
            logger.warning(
                "[RAG] MISTRAL_API_KEY not set — AI tutor and symptom chat disabled. "
                "Add your key to .env and restart."
            )
        else:
            self.mistral = Mistral(api_key=mistral_api_key)
        self.model_name = model_name

        count = self.collection.count()
        status = "ready" if count > 0 else "EMPTY - run ingest.py first"
        logger.info("[RAG] Knowledge base: %s chunks — %s", count, status)

    # =========================================================
    # ADD DOCUMENTS  (called by ingest.py)
    # =========================================================
    def add_documents(
        self,
        texts:     list[str],
        metadatas: list[dict],
        ids:       list[str],
        ):
        """Embed and upsert text chunks into ChromaDB in safe batches."""
        if not texts:
            return

        CHROMA_MAX_BATCH = 40000  # safely under ChromaDB's 41666 limit

        print(f"[RAG] Embedding and adding {len(texts)} chunks to ChromaDB...")
        embeddings = self.embedder.encode(
            texts,
            show_progress_bar=True,
            batch_size=64,
        ).tolist()

        # Split into safe batches for ChromaDB upsert
        for start in range(0, len(texts), CHROMA_MAX_BATCH):
            end = start + CHROMA_MAX_BATCH
            batch_num = (start // CHROMA_MAX_BATCH) + 1
            print(f"[RAG] Upserting batch {batch_num} ({start}→{min(end, len(texts))})...")
            self.collection.upsert(
            documents=texts[start:end],       # ✅ text content
            embeddings=embeddings[start:end], # ✅ vectors
            metadatas=metadatas[start:end],
            ids=ids[start:end],
        )

        print(f"[RAG] DB now has {self.collection.count()} total chunks.")

    # =========================================================
    # RETRIEVE CONTEXT
    # =========================================================
    def retrieve(
        self,
        query:       str,
        n_results:   int  = 6,
        filter_meta: dict = None,
    ) -> list[dict]:
        """
        Semantic search over ChromaDB.
        Returns list of {text, metadata, score}.
        """
        total = self.collection.count()
        if total == 0:
            return []

        query_emb = self.embedder.encode([query]).tolist()

        kwargs = {
            "query_embeddings": query_emb,
            "n_results":        min(n_results, total),
            "include":          ["documents", "metadatas", "distances"],
        }
        if filter_meta:
            kwargs["where"] = filter_meta

        res = self.collection.query(**kwargs)

        results = []
        for i in range(len(res["documents"][0])):
            results.append({
                "text":     res["documents"][0][i],
                "metadata": res["metadatas"][0][i],
                "score":    round(1 - res["distances"][0][i], 3),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results

    # =========================================================
    # BUILD CONTEXT STRING
    # =========================================================
    def build_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a readable context block."""
        if not chunks:
            return "No specific references found in the medical knowledge base."

        parts = []
        for i, chunk in enumerate(chunks, 1):
            meta   = chunk["metadata"]
            source = meta.get("source", "Medical Reference")
            book   = meta.get("book",   "")
            topic  = meta.get("topic",  "")
            score  = chunk["score"]

            header_parts = [f"Source {i}: {source}"]
            if book:
                header_parts.append(f"Book: {book}")
            if topic:
                header_parts.append(f"Topic: {topic}")
            header_parts.append(f"Relevance: {score}")

            parts.append(f"[{' | '.join(header_parts)}]\n{chunk['text']}")

        return "\n\n---\n\n".join(parts)

    # =========================================================
    # SYSTEM PROMPTS PER MODE
    # =========================================================
    _SYSTEM_PROMPTS = {
        "tutor": """You are MedBot, an expert AI medical tutor for a Medical AI Learning Platform.
Answer the student's question using the provided medical knowledge base context.
Be clear, educational, and accurate. Use simple language suitable for students.
Always cite which source your answer comes from (e.g. "According to Harrison's...").
If the context doesn't fully cover the question, supplement with your general medical knowledge
but clearly note: "This is from general knowledge, not the loaded references."
Never diagnose real patients — this platform is for education only.

MEDICAL KNOWLEDGE BASE CONTEXT:
{context}""",

        "organ": """You are a medical expert explaining organ anatomy and physiology.
Use the provided medical references to explain the organ clearly.
Structure your answer as:
1. Overview & Location
2. Anatomy & Structure
3. Key Functions
4. Common Diseases / Conditions
5. Interesting Facts

Use simple language suitable for medical students.
Cite your sources.

MEDICAL KNOWLEDGE BASE CONTEXT:
{context}""",

        "disease": """You are a clinical expert explaining a disease or medical condition.
Use the provided medical references to give a comprehensive explanation.
Structure your answer as:
1. What is it?
2. Causes & Risk Factors
3. Signs & Symptoms
4. Diagnosis
5. Treatment & Management
6. Prognosis & Prevention

Always note this is for educational purposes — patients must consult a real doctor.
Cite your sources.

MEDICAL KNOWLEDGE BASE CONTEXT:
{context}""",

        "symptom": """You are MedBot, an AI symptom analysis assistant.
Use the provided medical references to explain the matched conditions.
Be empathetic, clear, and accurate.
Always recommend seeing a qualified doctor for proper diagnosis and treatment.
If any emergency symptoms are present (chest pain, difficulty breathing, severe bleeding,
loss of consciousness), immediately emphasize calling emergency services (112 / 911).

MEDICAL KNOWLEDGE BASE CONTEXT:
{context}""",

        "quiz": """You are a medical education quiz generator.
Using the provided medical knowledge context, generate high-quality educational quiz questions.
Focus on understanding, not just memorization.

Format each question EXACTLY as:
Q[N]: [Question text]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter]
Explanation: [1-2 sentence explanation of why]

MEDICAL KNOWLEDGE BASE CONTEXT:
{context}""",
    }

    # =========================================================
    # MAIN RAG QUERY
    # =========================================================
    def query(
        self,
        question:     str,
        context_hint: str        = "",
        chat_history: list[dict] = None,
        max_tokens:   int        = 1000,
        mode:         str        = "tutor",
    ) -> dict:
        """
        Full RAG pipeline:
          1. Retrieve relevant chunks from ChromaDB
          2. Build context string
          3. Inject into system prompt
          4. Call Mistral chat API
          5. Return answer + sources + metadata
        """
        # 1. Retrieve
        search_query = f"{context_hint} {question}".strip()
        chunks       = self.retrieve(search_query, n_results=6)
        context      = self.build_context(chunks)
        has_context  = len(chunks) > 0

        # 2. Fill system prompt with context
        template = self._SYSTEM_PROMPTS.get(mode, self._SYSTEM_PROMPTS["tutor"])
        system   = template.format(context=context)

        # 3. Build messages list (plain dicts — no ChatMessage wrapper needed)
        messages = [{"role": "system", "content": system}]

        if chat_history:
            for turn in chat_history:
                if turn.get("role") in ("user", "assistant"):
                    messages.append({
                        "role":    turn["role"],
                        "content": str(turn["content"]),
                    })

        messages.append({"role": "user", "content": question})

        if self.mistral is None:
            raise EnvironmentError(
                "MISTRAL_API_KEY not set. Copy .env.example to .env, add your key, and restart."
            )

        # 4. Call Mistral — new SDK syntax ✅
        response = self.mistral.chat.complete(
            model=self.model_name,
            messages=messages,
            max_tokens=max_tokens,
        )

        answer = response.choices[0].message.content

        # 5. Extract unique sources
        sources = list({
            chunk["metadata"].get("source", "Medical Reference")
            for chunk in chunks
            if chunk["score"] >= 0.35
        })

        return {
            "answer":      answer,
            "sources":     sources,
            "chunks_used": len(chunks),
            "has_context": has_context,
        }

    # =========================================================
    # CONVENIENCE WRAPPERS
    # =========================================================

    def explain_organ(self, organ_name: str, chat_history: list[dict] = None) -> dict:
        """Used by: organ search page, after organ CNN detection."""
        return self.query(
            question     = (
                f"Explain the {organ_name}: its anatomy, location in the body, "
                f"key physiological functions, common diseases that affect it, "
                f"and any important clinical facts."
            ),
            context_hint = organ_name,
            chat_history = chat_history,
            max_tokens   = 900,
            mode         = "organ",
        )

    def explain_disease(self, disease_name: str, chat_history: list[dict] = None) -> dict:
        """Used by: after disease CNN detection, symptom checker results."""
        return self.query(
            question     = (
                f"Give a comprehensive clinical explanation of {disease_name}: "
                f"what it is, its causes and risk factors, signs and symptoms, "
                f"how it is diagnosed, treatment options, and prognosis."
            ),
            context_hint = disease_name,
            chat_history = chat_history,
            max_tokens   = 900,
            mode         = "disease",
        )

    def symptom_chat(
        self,
        message:     str,
        symptoms:    str,
        top_disease: str,
        chat_history: list = None,
    ) -> dict:
        """Used by: symptom checker AI follow-up chat."""
        return self.query(
            question     = message,
            context_hint = f"{top_disease} {symptoms}",
            chat_history = chat_history,
            max_tokens   = 700,
            mode         = "symptom",
        )

    def tutor_chat(self, message: str, chat_history: list = None) -> dict:
        """Used by: AI tutor page (general medical Q&A)."""
        return self.query(
            question     = message,
            chat_history = chat_history,
            max_tokens   = 800,
            mode         = "tutor",
        )

    def generate_quiz(self, topic: str, num_questions: int = 5) -> dict:
        """Used by: quiz mode page."""
        return self.query(
            question     = (
                f"Generate {num_questions} multiple choice questions "
                f"about {topic} for medical students."
            ),
            context_hint = topic,
            max_tokens   = 1400,
            mode         = "quiz",
        )

    # =========================================================
    # UTILITIES
    # =========================================================

    def get_stats(self) -> dict:
        """Return knowledge base statistics."""
        count = self.collection.count()
        return {
            "total_chunks": count,
            "collection":   self.collection.name,
            "status":       "ready" if count > 0 else "empty — run ingest.py",
        }

    def clear_collection(self):
        """Delete all documents from the collection. Use with care."""
        self.client.delete_collection(self.collection.name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection.name,
            metadata={"hnsw:space": "cosine"},
        )
        print("[RAG] Collection cleared.")


# ─────────────────────────────────────────────────────────────
# QUICK TEST  (python rag_system.py)
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    rag = MedicalRAG()
    print("\n=== Knowledge Base Stats ===")
    print(rag.get_stats())

    if rag.collection.count() > 0:
        print("\n=== Test Query: Tuberculosis ===")
        result = rag.explain_disease("Tuberculosis")
        print(result["answer"])
        print("\nSources:", result["sources"])
    else:
        print("\n⚠️  Knowledge base is empty. Run ingest.py first.")