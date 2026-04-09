import random
from fastapi import APIRouter, HTTPException, Query
from app.mongo import questions_col

router = APIRouter(prefix="/api/questions", tags=["questions"])

# Maps session difficulty → MongoDB difficulty value
DIFFICULTY_MAP = {
    "beginner":     "easy",
    "intermediate": "medium",
    "advanced":     "hard",
}


@router.get("/random")
def get_random_question(difficulty: str = Query(...)):
    mongo_diff = DIFFICULTY_MAP.get(difficulty)
    if not mongo_diff:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")

    pool = list(questions_col.find({"difficulty": mongo_diff}, {"_id": 0}))
    if not pool:
        raise HTTPException(status_code=404, detail="No questions found for this difficulty")

    return random.choice(pool)


@router.get("/random-pair")
def get_random_question_pair(difficulty: str = Query(...)):
    """Return two distinct random questions for a session (one per round)."""
    mongo_diff = DIFFICULTY_MAP.get(difficulty)
    if not mongo_diff:
        raise HTTPException(status_code=400, detail=f"Invalid difficulty: {difficulty}")

    pool = list(questions_col.find({"difficulty": mongo_diff}, {"_id": 0}))
    if len(pool) < 2:
        raise HTTPException(status_code=404, detail="Not enough questions for this difficulty")

    return random.sample(pool, 2)
