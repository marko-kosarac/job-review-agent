import json
import logging
from typing import Literal

from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from database import create_tables
from pdf_parser import extract_text_from_pdf
from agent import run_agent_stream
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


class AnalyzeRequest(BaseModel):
    cv_text: str
    job_url: str
    language: Literal["en", "sr"] = "en"


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
        async for event in run_agent_stream(payload.cv_text, payload.job_url, payload.language):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )
