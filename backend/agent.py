import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone

from openai import AsyncOpenAI
from config import OPENAI_API_KEY
from tools import analyze, generate_cover_letter, research_company, extract_job_info
from job_scraper import scrape_job, JobScrapeError
from database import SessionLocal
from models import Analysis

logger = logging.getLogger(__name__)
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

CACHE_TTL_HOURS = 24
MAX_CONCURRENT_JOBS = 4 


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "scrape_job",
            "description": "Scrapes job posting text from a URL",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Job posting URL"}
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "extract_job_info",
            "description": "Extracts the company name, job title, and location from the job posting that was already scraped",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_match",
            "description": "Analyzes the match between the candidate's CV and the scraped job posting",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_cover_letter",
            "description": "Generates a cover letter based on the candidate's CV and the scraped job posting",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "research_company",
            "description": "Researches company information, culture, salaries and reviews using the previously extracted company name and job title",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

PARALLEL_TOOLS = {"analyze_match", "generate_cover_letter", "research_company"}

STATUS_MESSAGES = {
    "scrape_job": "Reading the job posting...",
    "extract_job_info": "Finding the company, job title, and location...",
    "analyze_match": "Analyzing CV/job match...",
    "generate_cover_letter": "Writing cover letter...",
    "research_company": "Researching the company...",
}

LANGUAGE_NAMES = {"en": "English", "sr": "Serbian"}


def _system_prompt(language: str) -> str:
    language_name = LANGUAGE_NAMES.get(language, "English")
    return f"""You are a job application assistant.
Your task is to help candidates analyze job postings and prepare application materials.

When given a job URL and CV, you must use tools in this exact order:
1. Call scrape_job to get the job posting text
2. Call extract_job_info to get the company name, job title, and location
3. Call analyze_match, generate_cover_letter and research_company AT THE SAME TIME (parallel)

None of the tools need cv_text or job_text arguments — the server already has
that data from the current conversation. Just call the tools by name.

Use the available tools to complete these tasks. Write your final summary
message in {language_name}. Note: the cover letter tool always writes in
English regardless of this — don't mention that as an issue."""


def _get_cached_analysis(job_url: str, cv_text: str, language: str) -> Analysis | None:
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_TTL_HOURS)
        return (
            db.query(Analysis)
            .filter(
                Analysis.job_url == job_url,
                Analysis.cv_text == cv_text,
                Analysis.language == language,
                Analysis.created_at >= cutoff,
            )
            .order_by(Analysis.created_at.desc())
            .first()
        )
    finally:
        db.close()


def _parse_match_analysis(raw: str | None) -> dict:
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {"score": 0, "assessment": "unknown", "matches": [], "missing": [], "advice": []}


def _analysis_to_result(analysis: Analysis) -> dict:
    return {
        "id": analysis.id,
        "company_name": analysis.company_name,
        "job_title": analysis.job_title,
        "location": analysis.location,
        "analyze_match": _parse_match_analysis(analysis.match_analysis),
        "generate_cover_letter": {"cover_letter": analysis.cover_letter},
        "research_company": {"company_profile": analysis.company_profile},
        "summary": "This analysis was already done earlier — showing the saved result.",
    }


def _persist(job_url: str, state: dict, result: dict) -> str:
    db = SessionLocal()
    try:
        match_data = result.get("analyze_match", {})
        analysis = Analysis(
            job_url=job_url,
            company_name=state.get("company_name"),
            job_title=state.get("job_title"),
            location=state.get("location"),
            cv_text=state.get("cv_text"),
            job_text=state.get("job_text"),
            match_analysis=json.dumps(match_data, ensure_ascii=False),
            cover_letter=result.get("generate_cover_letter", {}).get("cover_letter"),
            company_profile=result.get("research_company", {}).get("company_profile"),
            match_score=match_data.get("score"),
            language=state.get("language"),
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis.id
    finally:
        db.close()


async def run_agent_stream(cv_text: str, job_url: str, language: str = "en"):
    """Runs the tool-calling agent loop for a single job posting."""
    state = {
        "cv_text": cv_text,
        "job_text": None,
        "company_name": None,
        "job_title": None,
        "location": None,
        "language": language,
    }

    async def call_tool(tool_name: str, tool_args: dict):
        if tool_name == "scrape_job":
            job_text = await asyncio.to_thread(scrape_job, tool_args["url"])
            state["job_text"] = job_text
            return {"status": "ok", "chars_scraped": len(job_text)}
        elif tool_name == "extract_job_info":
            info = await extract_job_info(state["job_text"])
            state["company_name"] = info["company_name"]
            state["job_title"] = info["job_title"]
            state["location"] = info["location"]
            return info
        elif tool_name == "analyze_match":
            return await analyze(state["cv_text"], state["job_text"], state["language"])
        elif tool_name == "generate_cover_letter":
            return await generate_cover_letter(state["cv_text"], state["job_text"])
        elif tool_name == "research_company":
            return await research_company(
                state.get("company_name") or "Unknown company",
                state.get("job_title") or "Unknown position",
                state["language"],
            )

    try:
        cached = await asyncio.to_thread(_get_cached_analysis, job_url, cv_text, language)
        if cached:
            yield {"status": "done", "result": _analysis_to_result(cached)}
            return

        messages = [
            {"role": "system", "content": _system_prompt(language)},
            {
                "role": "user",
                "content": f"Analyze this job posting for me.\n\nJob URL: {job_url}\n\nMy CV:\n{cv_text}"
            }
        ]

        result = {}

        while True:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )

            message = response.choices[0].message
            messages.append(message)

            if not message.tool_calls:
                result["summary"] = message.content
                result.pop("scrape_job", None)
                if "extract_job_info" in result:
                    result.pop("extract_job_info")
                    result["company_name"] = state.get("company_name")
                    result["job_title"] = state.get("job_title")
                    result["location"] = state.get("location")
                if "analyze_match" in result:
                    analysis_id = await asyncio.to_thread(_persist, job_url, state, result)
                    result["id"] = analysis_id
                yield {"status": "done", "result": result}
                break

            parallel_calls = []
            sequential_calls = []
            for tool_call in message.tool_calls:
                if tool_call.function.name in PARALLEL_TOOLS:
                    parallel_calls.append(tool_call)
                else:
                    sequential_calls.append(tool_call)

            scrape_failed = False
            for tool_call in sequential_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments or "{}")

                yield {"status": "progress", "message": STATUS_MESSAGES.get(tool_name, tool_name)}

                try:
                    tool_result = await call_tool(tool_name, tool_args)
                except JobScrapeError as e:
                    yield {"status": "error", "message": str(e)}
                    scrape_failed = True
                    break

                result[tool_name] = tool_result
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_result, ensure_ascii=False)
                })

            if scrape_failed:
                return

            if parallel_calls:
                names = [tc.function.name for tc in parallel_calls]
                yield {"status": "progress", "message": "In parallel: " + ", ".join(STATUS_MESSAGES.get(n, n) for n in names)}

                tasks = [call_tool(tc.function.name, json.loads(tc.function.arguments or "{}")) for tc in parallel_calls]
                results = await asyncio.gather(*tasks)

                for tool_call, tool_result in zip(parallel_calls, results):
                    result[tool_call.function.name] = tool_result
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(tool_result, ensure_ascii=False)
                    })
    except Exception:
        logger.exception("Agent run failed for job_url=%s", job_url)
        yield {"status": "error", "message": "An unexpected error occurred. Please try again."}


async def run_multi_job_stream(cv_text: str, job_urls: list[str], language: str = "en"):
    """Fans out run_agent_stream across multiple job URLs concurrently
    (capped by MAX_CONCURRENT_JOBS), tagging every event with the job_url it
    belongs to so the frontend can route progress/results to the right card.
    """
    queue: asyncio.Queue = asyncio.Queue()
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

    async def worker(job_url: str):
        try:
            async with semaphore:
                async for event in run_agent_stream(cv_text, job_url, language):
                    await queue.put({**event, "job_url": job_url})
        finally:
            await queue.put({"status": "job_complete", "job_url": job_url})

    tasks = [asyncio.create_task(worker(url)) for url in job_urls]
    remaining = len(job_urls)

    while remaining > 0:
        event = await queue.get()
        if event["status"] == "job_complete":
            remaining -= 1
            continue
        yield event

    await asyncio.gather(*tasks)
