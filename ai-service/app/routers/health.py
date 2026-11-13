import httpx
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health & System"])

@router.get("/health")
async def health_check():
    provider = (settings.LLM_PROVIDER or "groq").lower()

    # 1. Groq Provider Health Status
    groq_status = "not_configured"
    if settings.GROQ_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(
                    f"{settings.GROQ_BASE_URL}/models",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                )
                if res.status_code == 200:
                    groq_status = "connected"
                else:
                    groq_status = f"error (HTTP {res.status_code})"
        except Exception:
            groq_status = "unreachable"

    # 2. Local Ollama Health Status
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

    # Determine active model and readiness based on active provider
    if provider == "groq":
        active_llm = settings.GROQ_MODEL
        is_ready = (groq_status == "connected")
    else:
        active_llm = settings.OLLAMA_MODEL
        is_ready = ollama_model_downloaded

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "llm_provider": provider,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "groq_status": groq_status,
        "groq_model": settings.GROQ_MODEL,
        "ollama_status": ollama_status,
        "active_llm": active_llm,
        "model_downloaded": is_ready
    }

@router.get("/models")
async def list_models():
    provider = (settings.LLM_PROVIDER or "groq").lower()

    if provider == "groq":
        models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
        if settings.GROQ_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    res = await client.get(
                        f"{settings.GROQ_BASE_URL}/models",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
                    )
                    if res.status_code == 200:
                        data = res.json()
                        chat_models = [
                            m["id"] for m in data.get("data", [])
                            if "audio" not in m.get("input_modalities", [])
                        ]
                        if chat_models:
                            models = chat_models
            except Exception:
                pass
        return {
            "provider": "groq",
            "available_models": models,
            "active_model": settings.GROQ_MODEL,
            "recommended": "openai/gpt-oss-120b"
        }
    else:
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
            "provider": "ollama",
            "available_models": models,
            "active_model": settings.OLLAMA_MODEL,
            "recommended_lightweight": "qwen2.5:latest or llama3.2:1b"
        }
