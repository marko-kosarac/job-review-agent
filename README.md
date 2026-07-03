---
title: JobReview
emoji: 🧾
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: true
---

# JobReview

🚀 **Try it here:** [JobReview on Hugging Face](https://huggingface.co/spaces/mArkusixx/job-review-agent)

AI agent that analyzes job postings against a candidate's CV: match score, matched/missing
skills, a cover letter, and company research — for one or several job URLs at once.

## Required secrets

Set these as environment variables (Space secrets on Hugging Face, or a `backend/.env`
file locally):

- `OPENAI_API_KEY`
- `DATABASE_URL` — a Postgres connection string (e.g. a free Neon/Supabase instance)

## Local development

```bash
# backend
cd backend
python -m venv venv
venv\Scripts\activate  # or source venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload

# frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Docker

```bash
docker build -t jobreview .
docker run -p 7860:7860 --env-file backend/.env jobreview
```

Serves both the API and the built frontend from a single container on port 7860.