from fastapi import FastAPI, UploadFile, File
from openai import OpenAI, AsyncOpenAI
from config import OPENAI_API_KEY
from pdf_parser import extract_text_from_pdf
from job_scraper import scrape_job
from agent import analyze, generate_cover_letter, research_company, extract_company_name

app = FastAPI(title="JobReview API")
client = OpenAI(api_key=OPENAI_API_KEY)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/check-key")
def check_key():
    return {"key_loaded": bool(OPENAI_API_KEY)}

@app.get("/test-ai")
def test_ai():
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Reci 'JobReview radi!' na srpskom."}],
        max_tokens=50
    )
    return {"response": response.choices[0].message.content}

@app.post("/test-pdf")
async def test_pdf(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text_from_pdf(file_bytes)
    return {"characters": len(text), "preview": text[:300]}

@app.get("/test-scrape")
def test_scrape(url: str):
    text = scrape_job(url)
    return {"characters": len(text), "preview": text[:300]}

@app.post("/test-analyze")
async def test_analyze(cv_text: str, job_url: str):
    job_text = scrape_job(job_url)
    result = analyze(cv_text, job_text)
    return result

@app.post("/test-cover-letter")
async def test_cover_letter(cv_text: str, job_url: str):
    job_text = scrape_job(job_url)
    result = generate_cover_letter(cv_text, job_text)
    return result

@app.get("/test-company")
def test_company(company_name: str, job_title: str):
    result = research_company(company_name, job_title)
    return result

import asyncio

@app.post("/analyze")
async def full_analyze(cv_text: str, job_url: str):
    job_text = scrape_job(job_url)
    
    company_name = await extract_company_name(job_text)
    
    match_result, cover_result, company_result = await asyncio.gather(
        analyze(cv_text, job_text),
        generate_cover_letter(cv_text, job_text),
        research_company(company_name, "Software Developer")
    )
    
    return {
        "company_name": company_name,
        "match": match_result,
        "cover_letter": cover_result,
        "company": company_result
    }