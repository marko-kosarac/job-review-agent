from openai import OpenAI
from config import OPENAI_API_KEY

client = OpenAI(api_key=OPENAI_API_KEY)

def analyze(cv_text: str, job_text: str) -> dict:
    prompt = f"""
Analyze the match between the candidate's CV and the job posting.

=== JOB POSTING ===
{job_text}

=== CV ===
{cv_text}

Return your response in the following format:
1. SCORE: a number from 0 to 100 indicating the match
2. ASSESSMENT: "high", "medium" or "low" chance of passing the selection
3. MATCHES: list of things the candidate has that the job requires
4. MISSING: list of things the job requires that the candidate lacks
5. ADVICE: 3 concrete tips on how to improve the CV for this specific job

Respond in Serbian language.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )

    return {"analysis": response.choices[0].message.content}


def generate_cover_letter(cv_text: str, job_text: str) -> dict:
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
- Start with "Poštovani," and end with "S poštovanjem,"

Respond in Serbian language.
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000
    )

    return {"cover_letter": response.choices[0].message.content}

def research_company(company_name: str, job_title: str) -> dict:
    response = client.responses.create(
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

Respond in Serbian language.
"""
    )

    return {"company_profile": response.output_text}

def extract_company_name(job_text: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"""Extract only the company name from this job posting. 
Return only the company name, nothing else.

Job posting:
{job_text[:2000]}"""
        }],
        max_tokens=50
    )
    return response.choices[0].message.content.strip()