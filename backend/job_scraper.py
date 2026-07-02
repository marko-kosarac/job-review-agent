import requests
from bs4 import BeautifulSoup

def scrape_job(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Ukloni skripte i stilove
    for tag in soup(["script", "style", "nav", "footer"]):
        tag.decompose()
    
    text = soup.get_text(separator="\n", strip=True)
    return text[:8000]  # prvih 8000 karaktera