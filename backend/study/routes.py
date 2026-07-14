"""Study Companion API routes."""

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile

from study.db import get_book
from study.schemas import (
    BookChatRequest,
    ExamGenerateRequest,
    QuizGenerateRequest,
    QuizSubmitRequest,
    StudyToolRequest,
)
from study.service import (
    chat_with_book,
    create_exam,
    create_quiz,
    get_book_analytics,
    list_library,
    process_book_upload,
    register_upload,
    remove_book,
    run_study_tool,
    submit_assessment,
)

router = APIRouter(prefix="/study", tags=["Study Companion"])


@router.get("/books")
async def study_list_books():
    return {"books": list_library()}


@router.get("/books/{book_id}")
async def study_get_book(book_id: str):
    book = get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@router.post("/books/upload")
async def study_upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    try:
        payload = register_upload(file.filename, await file.read())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    book = payload["book"]
    background_tasks.add_task(process_book_upload, book["id"], payload["saved_path"])
    return {
        "book_id": book["id"],
        "title": book["title"],
        "status": book["status"],
        "message": "Upload received. Indexing started.",
    }


@router.delete("/books/{book_id}")
async def study_delete_book(book_id: str):
    remove_book(book_id)
    return {"status": "deleted", "book_id": book_id}


@router.post("/books/{book_id}/chat")
async def study_chat(book_id: str, payload: BookChatRequest):
    try:
        result = chat_with_book(
            book_id,
            payload.message,
            [m.model_dump() for m in payload.history],
            payload.chapter_id,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/books/{book_id}/quiz/generate")
async def study_generate_quiz(book_id: str, payload: QuizGenerateRequest):
    try:
        return create_quiz(book_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/books/{book_id}/exam/generate")
async def study_generate_exam(book_id: str, payload: ExamGenerateRequest):
    try:
        return create_exam(book_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/books/{book_id}/assessment/submit")
async def study_submit_assessment(book_id: str, payload: QuizSubmitRequest):
    try:
        return submit_assessment(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/books/{book_id}/analytics")
async def study_analytics(book_id: str):
    try:
        return get_book_analytics(book_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/books/{book_id}/tools/{tool}")
async def study_tools(book_id: str, tool: str, payload: StudyToolRequest):
    if tool not in {"summary", "revision", "flashcards", "compare"}:
        raise HTTPException(status_code=400, detail="Unknown study tool")
    try:
        return run_study_tool(book_id, tool, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (KeyError, RuntimeError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
