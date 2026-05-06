"""
AI Feedback Router
==================
Generates AI-based feedback for the *interviewee* in each round using:
  - The coding question presented to them
  - Their final submitted code (from sessions.code_round1 / code_round2)
  - The conversation transcript captured by the frontend over the session

Flow
----
POST /api/sessions/link/{session_link}/ai-feedback
  Body:
    {
      "round": 1 | 2,
      "transcript": "...",   # full conversation text for that part
    }

The endpoint:
  1. Verifies the caller is a participant
  2. Determines which question + code belongs to the caller *as interviewee*
     - Round 1 host is interviewee  → interviewee code = code_round1
     - Round 2 guest is interviewee → interviewee code = code_round2
  3. Calls the OpenAI GPT-4o API with a structured prompt
  4. Persists the result in ai_feedback table (upsert)
  5. Returns the structured feedback JSON

GET /api/sessions/link/{session_link}/ai-feedback
  Returns the stored AI feedback for the calling user (both rounds if available).
"""

from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.database import execute
from app.security import verify_clerk_token, get_or_create_user
from app.config import OPENAI_API_KEY
from app.mongo import questions_col

router = APIRouter(prefix="/api/sessions", tags=["ai-feedback"])
bearer_scheme = HTTPBearer()


# ── Request / Response models ─────────────────────────────────────────────────

class AIFeedbackRequest(BaseModel):
    round: int          # 1 or 2
    transcript: str     # full conversation text (both participants) for that round


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_prompt(
    question_title: str,
    question_description: str,
    question_difficulty: str,
    code: str,
    language: str,
    transcript: str,
) -> str:
    """Build the OpenAI prompt for interview feedback."""
    return f"""You are an expert technical interviewer and coding coach. Your task is to provide comprehensive, constructive feedback for a candidate who just completed a mock technical interview.

## Interview Context
- **Question**: {question_title}
- **Difficulty**: {question_difficulty}
- **Question Description**:
{question_description}

## Candidate's Final Code ({language})
```{language.lower()}
{code}
```

## Conversation Transcript (between candidate and interviewer)
{transcript if transcript.strip() else "(No transcript available — evaluate based on code alone)"}

## Your Task
Analyze the candidate's performance across the following dimensions and provide actionable feedback. Be specific, reference their actual code and responses, and be encouraging while being honest.

Respond ONLY with a valid JSON object (no markdown, no extra text) with this exact structure:
{{
  "overall_score": <integer 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": [
    "<specific strength 1>",
    "<specific strength 2>",
    "<specific strength 3>"
  ],
  "areas_for_improvement": [
    "<specific improvement 1>",
    "<specific improvement 2>",
    "<specific improvement 3>"
  ],
  "code_quality": {{
    "score": <integer 1-10>,
    "feedback": "<specific feedback on their code — correctness, efficiency, style, edge cases>"
  }},
  "problem_solving": {{
    "score": <integer 1-10>,
    "feedback": "<how they approached the problem, broke it down, asked clarifying questions>"
  }},
  "communication": {{
    "score": <integer 1-10>,
    "feedback": "<how clearly they explained their thinking, interacted with the interviewer>"
  }},
  "time_complexity": {{
    "identified": <true | false>,
    "candidate_answer": "<what they said, or 'Not mentioned'>",
    "correct_answer": "<actual time complexity>",
    "feedback": "<feedback on their complexity analysis>"
  }},
  "suggested_study_topics": [
    "<topic 1>",
    "<topic 2>",
    "<topic 3>"
  ],
  "interviewer_tips": "<1-2 sentences of advice for their next interview>"
}}"""


async def _call_openai(prompt: str) -> dict:
    """Call the OpenAI GPT-4o API and return the parsed JSON response."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI feedback is not configured (missing OPENAI_API_KEY)")

    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},  # guarantees valid JSON output
            max_tokens=2048,
            temperature=0.4,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert technical interviewer and coding coach. Always respond with valid JSON only.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {exc}") from exc

    raw_text = response.choices[0].message.content or ""

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI returned invalid JSON: {exc}") from exc


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/link/{session_link}/ai-feedback", status_code=200)
async def generate_ai_feedback(
    session_link: str,
    body: AIFeedbackRequest,
    request: Request,
    _token=Depends(bearer_scheme),
):
    """
    Generate AI-based feedback for the calling user as an interviewee in the
    specified round.  Results are cached in the database so subsequent calls
    return the stored value instantly.
    """
    if body.round not in (1, 2):
        raise HTTPException(status_code=400, detail="round must be 1 or 2")

    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")
    get_or_create_user(user_id, jwt_payload=payload)

    session = execute(
        """SELECT id, host_user_id, guest_user_id,
                  question1_slug, question2_slug,
                  code_round1, code_round2,
                  lang_round1, lang_round2,
                  status
           FROM sessions WHERE session_link = %s""",
        (session_link,),
        fetch="one",
    )
    if not session or user_id not in (session["host_user_id"], session["guest_user_id"]):
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] not in ("completed", "active"):
        raise HTTPException(status_code=400, detail="Session is not completed yet")

    # Determine which question/code applies to this user *as interviewee*
    # Round 1: host = interviewee → question1, code_round1
    # Round 2: guest = interviewee → question2, code_round2
    is_host = session["host_user_id"] == user_id

    if body.round == 1:
        if not is_host:
            raise HTTPException(status_code=403, detail="You were the interviewer in round 1")
        question_slug = session["question1_slug"]
        code = session["code_round1"] or ""
        lang = session["lang_round1"] or "python"
    else:
        if is_host:
            raise HTTPException(status_code=403, detail="You were the interviewer in round 2")
        question_slug = session["question2_slug"]
        code = session["code_round2"] or ""
        lang = session["lang_round2"] or "python"

    if not question_slug:
        raise HTTPException(status_code=400, detail="No question assigned for this round")

    # ── Check cache first ─────────────────────────────────────────────────────
    cached = execute(
        """SELECT feedback_json FROM ai_feedback
           WHERE session_id = %s AND user_id = %s AND round = %s""",
        (session["id"], user_id, body.round),
        fetch="one",
    )
    if cached:
        return {"feedback": json.loads(cached["feedback_json"]), "cached": True}

    # ── Fetch question from MongoDB ───────────────────────────────────────────
    question = questions_col.find_one({"slug": question_slug}, {"_id": 0})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found in database")

    question_title = question.get("title", question_slug)
    question_description = question.get("description", "")
    question_difficulty = question.get("difficulty", "medium")

    # ── Call OpenAI ───────────────────────────────────────────────────────────
    prompt = _build_prompt(
        question_title=question_title,
        question_description=question_description,
        question_difficulty=question_difficulty,
        code=code,
        language=lang,
        transcript=body.transcript,
    )

    feedback_json = await _call_openai(prompt)

    # ── Persist to DB ─────────────────────────────────────────────────────────
    execute(
        """INSERT INTO ai_feedback (session_id, user_id, round, feedback_json)
           VALUES (%s, %s, %s, %s)
           ON CONFLICT (session_id, user_id, round)
           DO UPDATE SET feedback_json = EXCLUDED.feedback_json,
                         updated_at = NOW()""",
        (session["id"], user_id, body.round, json.dumps(feedback_json)),
    )

    return {"feedback": feedback_json, "cached": False}


@router.get("/link/{session_link}/ai-feedback")
async def get_ai_feedback(
    session_link: str,
    request: Request,
    _token=Depends(bearer_scheme),
):
    """Return cached AI feedback for the calling user (both rounds if available)."""
    payload = await verify_clerk_token(request)
    user_id = payload.get("sub")

    session = execute(
        "SELECT id, host_user_id, guest_user_id FROM sessions WHERE session_link = %s",
        (session_link,),
        fetch="one",
    )
    if not session or user_id not in (session["host_user_id"], session["guest_user_id"]):
        raise HTTPException(status_code=404, detail="Session not found")

    rows = execute(
        """SELECT round, feedback_json FROM ai_feedback
           WHERE session_id = %s AND user_id = %s
           ORDER BY round""",
        (session["id"], user_id),
        fetch="all",
    )

    result: dict[str, Optional[dict]] = {"round1": None, "round2": None}
    for row in (rows or []):
        key = f"round{row['round']}"
        result[key] = json.loads(row["feedback_json"])

    return result
