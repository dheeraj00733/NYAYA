import os

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        PROJECT_NAME: str = "NyayaFlow AI Service"
        VERSION: str = "1.0.0"
        API_PREFIX: str = ""
        PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
        
        # Database
        DB_HOST: str = os.getenv("DB_HOST", "localhost")
        DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
        DB_NAME: str = os.getenv("DB_NAME", "nyayaflow_db")
        DB_USER: str = os.getenv("DB_USER", "postgres")
        DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
        