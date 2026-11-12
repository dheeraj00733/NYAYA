import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db_pool
from app.routers import health, document, rag

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nyayaflow.ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NyayaFlow AI Engine...")
    init_db_pool()
    logger.info(f"NyayaFlow AI Service ready on port {settings.PORT}")
    yield
    logger.info("Shutting down NyayaFlow AI Engine...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="NyayaFlow AI Microservice - PDF Ingestion, pgvector Embedding, RAG Engine, Fact Extraction & Legal Summarization",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(health.router)
app.include_router(document.router)
app.include_router(rag.router)

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
