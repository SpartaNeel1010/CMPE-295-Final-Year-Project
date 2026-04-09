from pymongo import MongoClient
from app.config import MONGO_URI

_client = MongoClient(MONGO_URI)
mongo_db = _client["interviewramp"]
questions_col = mongo_db["questions"]
