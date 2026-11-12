import httpx
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health & System"])

@router.get("/health")
async def health_check():
    ollama_status = "offline"
    ollama_model_downloaded = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                ollama_status = "connected"
                data = res.json()
                installed_names = [m.get("name", "") for m in data.get("models", [])]
                active_base = settings.OLLAMA_MODEL.split(":")[0]
                ollama_model_downloaded = any(
                    m == settings.OLLAMA_MODEL or m.startswith(f"{active_base}:")
                    for m in installed_names
                )
    except Exception:
        ollama_status = "offline (host Ollama not running or port 11434 unreachable)"

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "ollama_status": ollama_status,
        "active_llm": settings.OLLAMA_MODEL,
        "model_downloaded": ollama_model_downloaded
    }

@router.get("/models")
async def list_models():
    models = ["qwen2.5:latest", "llama3.2:1b", "llama3.2:3b", "mistral:latest"]
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                data = res.json()
                installed = [m["name"] for m in data.get("models", [])]
                if installed:
                    models = installed
    except Exception:
        pass

    return {
        "available_models": models,
        "active_model": settings.OLLAMA_MODEL,
        "recommended_lightweight": "qwen2.5:latest or llama3.2:1b"
    }
