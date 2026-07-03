import requests
from bs4 import BeautifulSoup
from cache import TTLCache

NOISE_TAGS = ["script", "style", "nav", "footer", "header", "aside", "form", "iframe", "svg", "noscript"]

CONTENT_SELECTORS = [
    "article",
    "main",
    "[class*=description]",
    "[id*=description]",
    "[class*=job-details]",
    "[class*=jobDetails]",
    "[class*=posting]",
    "[class*=content]",
]

MAX_CHARS = 8000
CACHE_TTL_SECONDS = 60 * 60

_job_cache = TTLCache(ttl_seconds=CACHE_TTL_SECONDS)


class JobScrapeError(Exception):
    pass


def scrape_job(url: str) -> str:
    cached = _job_cache.get(url)
    if cached is not None:
        return cached

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise JobScrapeError(f"Couldn't load the job posting from that URL: {e}") from e

    soup = BeautifulSoup(response.text, "html.parser")
    for tag in soup(NOISE_TAGS):
        tag.decompose()

    text = _extract_main_text(soup)
    if not text.strip():
        raise JobScrapeError("The job posting doesn't contain any text content to analyze.")

    _job_cache.set(url, text)
    return text


def _extract_main_text(soup: BeautifulSoup) -> str:
    for selector in CONTENT_SELECTORS:
        node = soup.select_one(selector)
        if node:
            text = _clean_text(node.get_text(separator="\n", strip=True))
            if len(text) > 200:
                return text[:MAX_CHARS]

    return _clean_text(soup.get_text(separator="\n", strip=True))[:MAX_CHARS]


def _clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)
