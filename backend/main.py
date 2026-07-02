from fastapi import FastAPI, Depends, UploadFile, File
from openai import OpenAI
from config import OPENAI_API_KEY
from job_scraper import scrape_job
from agent import analyze, generate_cover_letter, research_company, extract_company_name
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables, get_db
from models import Analysis
from pdf_parser import extract_text_from_pdf
from sqlalchemy.orm import Session
import asyncio

app = FastAPI(title="JobReview API")
client = OpenAI(api_key=OPENAI_API_KEY)
create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/test-pdf")
async def test_pdf(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text_from_pdf(file_bytes)
    return {"text": text}

@app.post("/analyze")
async def full_analyze(cv_text: str, job_url: str, db: Session = Depends(get_db)):
    job_text = scrape_job(job_url)
    
    company_name = await extract_company_name(job_text)
    
    match_result, cover_result, company_result = await asyncio.gather(
        analyze(cv_text, job_text),
        generate_cover_letter(cv_text, job_text),
        research_company(company_name, "Software Developer")
    )

    analysis = Analysis(
        job_url=job_url,
        company_name=company_name,
        cv_text=cv_text,
        job_text=job_text,
        match_analysis=match_result["analysis"],
        cover_letter=cover_result["cover_letter"],
        company_profile=company_result["company_profile"],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    
    return {
        "id": analysis.id,
        "company_name": company_name,
        "match": match_result,
        "cover_letter": cover_result,
        "company": company_result
    }