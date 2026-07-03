import json
import logging
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from database import create_tables
from pdf_parser import extract_text_from_pdf
from agent import run_multi_job_stream
from rate_limit import rate_limit

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="JobReview API")
create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_JOBS_PER_REQUEST = 5


class AnalyzeRequest(BaseModel):
    cv_text: str
    job_urls: list[str] = Field(min_length=1, max_length=MAX_JOBS_PER_REQUEST)
    language: Literal["en", "sr"] = "en"

    @field_validator("cv_text")
    @classmethod
    def _require_cv_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("CV text is required.")
        return value

    @field_validator("job_urls")
    @classmethod
    def _clean_urls(cls, value: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(u.strip() for u in value if u.strip()))
        if not cleaned:
            raise ValueError("At least one job URL is required.")
        return cleaned


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/test-pdf")
async def test_pdf(file: UploadFile = File(...), _rl=Depends(rate_limit)):
    file_bytes = await file.read()
    text = extract_text_from_pdf(file_bytes)
    return {"text": text}


@app.post("/agent-stream")
async def agent_stream(payload: AnalyzeRequest, _rl=Depends(rate_limit)):
    async def event_generator():
        async for event in run_multi_job_stream(payload.cv_text, payload.job_urls, payload.language):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

FRONTEND_DIST = Path(__file__).parent / "static"
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
