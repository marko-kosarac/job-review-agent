import json
from openai import AsyncOpenAI
from config import OPENAI_API_KEY
from cache import TTLCache

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

COMPANY_RESEARCH_TTL_SECONDS = 60 * 60 * 24  # company info rarely changes day to day
_company_research_cache = TTLCache(ttl_seconds=COMPANY_RESEARCH_TTL_SECONDS)

LANGUAGE_NAMES = {"en": "English", "sr": "Serbian"}


def _language_instruction(language: str) -> str:
    return f"Respond in {LANGUAGE_NAMES.get(language, 'English')}."


async def extract_job_info(job_text: str) -> dict:
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Extract the company name, job title, and location from this job posting.
Return strict JSON in this exact shape: {{"company_name": "...", "job_title": "...", "location": "..."}}
If the job title isn't explicit, infer the most likely title from context.
For location, use a short form like "Berlin, Remote" or "Remote" or "Unknown" if it isn't stated.

Job posting:
{job_text[:2000]}"""
        }],
        response_format={"type": "json_object"},
        max_tokens=120
    )
    data = json.loads(response.choices[0].message.content)
    return {
        "company_name": data.get("company_name") or "Unknown company",
        "job_title": data.get("job_title") or "Unknown position",
        "location": data.get("location") or "Unknown",
    }


async def analyze(cv_text: str, job_text: str, language: str = "en") -> dict:
    prompt = f"""
Analyze the match between the candidate's CV and the job posting.

=== JOB POSTING ===
{job_text}

=== CV ===
{cv_text}

Return strict JSON in this exact shape:
{{
  "score": <integer 0-100, match score>,
  "assessment": "<one of: high, medium, low — chance of passing the selection>",
  "matches": [<short strings — things the candidate has that the job requires>],
  "missing": [<short strings — things the job requires that the candidate lacks>],
  "advice": [<3 short, concrete tips to improve the CV for this specific job>]
}}

{_language_instruction(language)} (keep "assessment" as one of the literal English
words high/medium/low so the UI can style it, but write matches/missing/advice
in the requested language)
"""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=800
    )
    try:
        data = json.loads(response.choices[0].message.content)
    except (TypeError, json.JSONDecodeError):
        data = {}

    return {
        "score": data.get("score", 0),
        "assessment": data.get("assessment", "unknown"),
        "matches": data.get("matches", []),
        "missing": data.get("missing", []),
        "advice": data.get("advice", []),
    }


async def generate_cover_letter(cv_text: str, job_text: str) -> dict:
    # Always English, regardless of the chosen output language — cover letters
    # are meant to be sent to employers, most of whom expect English.
    prompt = f"""
Based on the candidate's CV and the job posting, write a professional cover letter.

=== JOB POSTING ===
{job_text}

=== CV ===
{cv_text}

Instructions:
- Write 3-4 paragraphs
- Use specific details from both the CV and the job posting
- Highlight the strongest matches
- Professional but not robotic tone
- Write in first person
- Start with "Dear Hiring Manager," and end with "Sincerely,"

Always respond in English, regardless of the CV or job posting's language.
"""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )
    return {"cover_letter": response.choices[0].message.content}


async def research_company(company_name: str, job_title: str, language: str = "en") -> dict:
    # Cached by company name + language (not job_title) — a company's culture/
    # salary profile is reusable across different postings from the same employer.
    cache_key = f"{company_name.strip().lower()}:{language}"
    cached = _company_research_cache.get(cache_key)
    if cached is not None:
        return {"company_profile": cached}

    response = await client.responses.create(
        model="gpt-4o",
        tools=[{"type": "web_search_preview"}],
        input=f"""
Research the company "{company_name}" and provide a detailed profile.

Find information about:
1. When was the company founded and where is it headquartered
2. What does the company do, business model
3. Company culture and work environment
4. Salary range for the position "{job_title}" (from Glassdoor, LinkedIn Salary or similar)
5. Employee reviews and experiences
6. Pros and cons of working there
7. Glassdoor rating if available

{_language_instruction(language)}
"""
    )
    profile = response.output_text
    _company_research_cache.set(cache_key, profile)
    return {"company_profile": profile}
