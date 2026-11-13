import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    for candidate in [
        Path(__file__).resolve().parent.parent.parent.parent / ".env",
        Path(__file__).resolve().parent.parent.parent / ".env",
        Path.cwd() / ".env"
    ]:
        if candidate.exists():
            load_dotenv(dotenv_path=candidate, override=False)
except ImportError:
    pass

try:
    from pydantic_settings import BaseSettings
    class Settings(BaseSettings):
        PROJECT_NAME: str = "NyayaFlow AI Service"
        VERSION: str = "1.0.0"
        API_PREFIX: str = ""
        PORT: int = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
        
        # Database
        DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        DB_HOST: str = os.getenv("DB_HOST", "localhost")
        DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
        DB_NAME: str = os.getenv("DB_NAME", "nyayaflow_db")
        DB_USER: str = os.getenv("DB_USER", "postgres")
        DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
        
        # LLM Provider Configuration ('groq' or 'ollama')
        LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq").lower()
        
        # Groq LLM (Production Provider)
        GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
        GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        
        # Ollama LLM (Local Development Provider)
        OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        
        # Embeddings
        EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "deterministic-feature-hashing-384")
        EMBEDDING_DIMENSION: int = 384
        
        # Chunker settings
        CHUNK_SIZE: int = 400
        CHUNK_OVERLAP: int = 50
        
        # OCR
        OCR_ENABLED: bool = True
        
        @property
        def active_llm_model(self) -> str:
            if self.LLM_PROVIDER == "groq":
                return self.GROQ_MODEL
            return self.OLLAMA_MODEL

        @property
        def database_url(self) -> str:
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

except ImportError:
    # Pure Python standard library fallback when pydantic_settings is not installed in global env
    class Settings:
        PROJECT_NAME: str = "NyayaFlow AI Service"
        VERSION: str = "1.0.0"
        API_PREFIX: str = ""
        PORT: int = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))
        
        # Database
        DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        DB_HOST: str = os.getenv("DB_HOST", "localhost")
        DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
        DB_NAME: str = os.getenv("DB_NAME", "nyayaflow_db")
        DB_USER: str = os.getenv("DB_USER", "postgres")
        DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
        
        # LLM Provider Configuration ('groq' or 'ollama')
        LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq").lower()
        
        # Groq LLM (Production Provider)
        GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
        GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        
        # Ollama LLM (Local Development Provider)
        OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:latest")
        
        # Embeddings
        EMBEDDING_MODEL_NAME: str = os.getenv("EMBEDDING_MODEL_NAME", "deterministic-feature-hashing-384")
        EMBEDDING_DIMENSION: int = 384
        
        # Chunker settings
        CHUNK_SIZE: int = 400
        CHUNK_OVERLAP: int = 50
        
        # OCR
        OCR_ENABLED: bool = True

        @property
        def active_llm_model(self) -> str:
            if self.LLM_PROVIDER == "groq":
                return self.GROQ_MODEL
            return self.OLLAMA_MODEL

        @property
        def database_url(self) -> str:
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

settings = Settings()
