import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATASET_PATH: str = '../../../dataset_deduplicated.csv'
    # The source CSV is append-only for real user submissions. No parallel database or sidecar is used.
    APP_SUBMISSIONS_PATH: str = ''
    AUDIT_LOG_PATH: str = './data/audit_log.csv'
    CORS_ORIGINS: List[str] = ['http://localhost:5173', 'http://localhost:3000']

    class Config:
        env_file = ".env"

settings = Settings()
