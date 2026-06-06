"""Pydantic schemas for Study Companion."""

from typing import Any, Literal

from pydantic import BaseModel, Field

BookStatus = Literal["processing", "ready", "failed"]
QuestionType = Literal["mcq", "true_false", "short_answer", "fill_blank", "clinical_scenario"]
Difficulty = Literal["easy", "medium", "hard", "mixed"]
ExamStyle = Literal["general", "usmle", "clinical", "high_yield"]


class BookChapter(BaseModel):
    id: str
    title: str
    start_page: int
    end_page: int


class StudyBook(BaseModel):
    id: str
    title: str
    filename: str
    file_type: str
    status: BookStatus
    progress: float
    chunk_count: int
    page_count: int
    chapters: list[BookChapter] = Field(default_factory=list)
    error_message: str | None = None
    created_at: str
    updated_at: str


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class BookChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    chapter_id: str | None = None


class BookChatResponse(BaseModel):
    answer: str
    citations: list[dict[str, Any]] = Field(default_factory=list)
    disclaimer: str


class QuizGenerateRequest(BaseModel):
    num_questions: int = Field(default=10, ge=3, le=40)
    difficulty: Difficulty = "mixed"
    question_types: list[QuestionType] = Field(default_factory=lambda: ["mcq", "true_false"])
    chapter_ids: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    exam_style: ExamStyle = "general"


class ExamGenerateRequest(BaseModel):
    num_questions: int = Field(default=25, ge=10, le=60)
    difficulty: Difficulty = "mixed"
    chapter_ids: list[str] = Field(default_factory=list)
    exam_style: ExamStyle = "general"
    time_limit_minutes: int = Field(default=45, ge=10, le=180)


class QuizQuestion(BaseModel):
    id: str
    type: QuestionType
    question: str
    options: list[str] = Field(default_factory=list)
    topic: str = ""
    chapter: str = ""
    difficulty: Difficulty = "medium"


class QuizGenerateResponse(BaseModel):
    attempt_id: str
    questions: list[QuizQuestion]
    disclaimer: str


class QuizSubmitRequest(BaseModel):
    attempt_id: str
    answers: dict[str, str]
    duration_seconds: int = 0


class QuestionResult(BaseModel):
    id: str
    correct: bool
    user_answer: str
    correct_answer: str
    explanation: str
    topic: str = ""


class QuizSubmitResponse(BaseModel):
    score: float
    percentage: float
    total: int
    correct: int
    results: list[QuestionResult]
    topic_breakdown: list[dict[str, Any]]
    strengths: list[str]
    weaknesses: list[str]
    recommendations: list[str]
    readiness_level: str
    disclaimer: str


class StudyToolRequest(BaseModel):
    chapter_id: str | None = None
    topic: str | None = None
    num_items: int = Field(default=10, ge=3, le=30)
