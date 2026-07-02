import json
import asyncio
from openai import AsyncOpenAI
from config import OPENAI_API_KEY
from tools import analyze, generate_cover_letter, research_company, extract_company_name
from job_scraper import scrape_job

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

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
            "name": "extract_company_name",
            "description": "Extracts company name from job posting text",
            "parameters": {
                "type": "object",
                "properties": {
                    "job_text": {"type": "string", "description": "Job posting text"}
                },
                "required": ["job_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analyze_match",
            "description": "Analyzes the match between CV and job posting",
            "parameters": {
                "type": "object",
                "properties": {
                    "cv_text": {"type": "string"},
                    "job_text": {"type": "string"}
                },
                "required": ["cv_text", "job_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_cover_letter",
            "description": "Generates a cover letter based on CV and job posting",
            "parameters": {
                "type": "object",
                "properties": {
                    "cv_text": {"type": "string"},
                    "job_text": {"type": "string"}
                },
                "required": ["cv_text", "job_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "research_company",
            "description": "Researches company information, culture, salaries and reviews",
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                    "job_title": {"type": "string"}
                },
                "required": ["company_name", "job_title"]
            }
        }
    }
]


async def call_tool(tool_name: str, tool_args: dict):
    if tool_name == "scrape_job":
        return scrape_job(tool_args["url"])
    elif tool_name == "extract_company_name":
        return await extract_company_name(tool_args["job_text"])
    elif tool_name == "analyze_match":
        return await analyze(tool_args["cv_text"], tool_args["job_text"])
    elif tool_name == "generate_cover_letter":
        return await generate_cover_letter(tool_args["cv_text"], tool_args["job_text"])
    elif tool_name == "research_company":
        return await research_company(tool_args["company_name"], tool_args.get("job_title", "Software Developer"))


async def run_agent(cv_text: str, job_url: str) -> dict:
    messages = [
        {
            "role": "system",
            "content": """You are a job application assistant. 
Your task is to help candidates analyze job postings and prepare application materials.

When given a job URL and CV, you must use tools in this exact order:
1. Call scrape_job to get the job posting text
2. Call extract_company_name to get the company name
3. Call analyze_match, generate_cover_letter and research_company AT THE SAME TIME (parallel)

Use the available tools to complete these tasks. Respond in Serbian language."""
        },
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
            break

        # Grupišemo tool calls — paralelni vs sekvencijalni
        parallel_tools = ["analyze_match", "generate_cover_letter", "research_company"]
        parallel_calls = []
        sequential_calls = []

        for tool_call in message.tool_calls:
            if tool_call.function.name in parallel_tools:
                parallel_calls.append(tool_call)
            else:
                sequential_calls.append(tool_call)

        # Sekvencijalni alati (scrape, extract)
        for tool_call in sequential_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            print(f"Agent poziva (sekvencijalno): {tool_name}")

            tool_result = await call_tool(tool_name, tool_args)
            result[tool_name] = tool_result

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result, ensure_ascii=False)
            })

        # Paralelni alati (analyze, cover, company)
        if parallel_calls:
            print(f"Agent poziva paralelno: {[tc.function.name for tc in parallel_calls]}")

            tasks = [
                call_tool(tc.function.name, json.loads(tc.function.arguments))
                for tc in parallel_calls
            ]
            results = await asyncio.gather(*tasks)

            for tool_call, tool_result in zip(parallel_calls, results):
                result[tool_call.function.name] = tool_result
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(tool_result, ensure_ascii=False)
                })

    return result