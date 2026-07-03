import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException

WINDOW_SECONDS = 300
MAX_REQUESTS = 10

_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _hits[ip]

    while hits and hits[0] < now - WINDOW_SECONDS:
        hits.popleft()

    if len(hits) >= MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again in a few minutes.")

    hits.append(now)
