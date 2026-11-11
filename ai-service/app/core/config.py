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
        
        OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        
        # Embeddings
        EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
        EMBEDDING_DIMENSION: int = 384
        
        # Chunker settings
        CHUNK_SIZE: int = 400
        CHUNK_OVERLAP: int = 50
        
        # OCR
        OCR_ENABLED: bool = True
        
        @property
        def database_url(self) -> str:
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

except ImportError:
    # Pure Python standard library fallback when pydantic_settings is not installed in global env