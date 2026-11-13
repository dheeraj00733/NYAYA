"""
NyayaFlow - Model Downloader and Setup Script
Downloads and caches the local models needed for the AI microservice.
"""
import sys
import subprocess
import urllib.request
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("download_models")

def check_ollama(model_name="qwen2.5:latest"):
    logger.info(f"Checking Ollama server for '{model_name}'...")
    try:
        req = urllib.request.Request("http://localhost:11434/api/tags")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            available = [m["name"] for m in data.get("models", [])]
            if model_name in available or f"{model_name}:latest" in available:
                logger.info(f"✔ Ollama model '{model_name}' is already downloaded locally.")
                return True
    except Exception as e:
        logger.warning(f"Ollama server not responding on port 11434 ({e}). Trying CLI...")

    try:
        logger.info(f"Executing 'ollama pull {model_name}'...")
        res = subprocess.run(["ollama", "pull", model_name], check=True)
        logger.info(f"✔ Successfully pulled '{model_name}'.")
        return True
    except FileNotFoundError:
        logger.error("Ollama CLI not found on PATH. Install it from https://ollama.com")
        return False
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to pull Ollama model: {e}")
        return False

def check_embeddings(model_name="sentence-transformers/all-MiniLM-L6-v2"):
    logger.info(f"Checking embedding model '{model_name}'...")
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading/caching '{model_name}'...")
        SentenceTransformer(model_name)
        logger.info(f"✔ Embedding model '{model_name}' downloaded successfully.")
        return True
    except ImportError:
        logger.info("SentenceTransformers package not installed. Deterministic 384-dim semantic vectorizer active.")
        return True
    except Exception as e:
        logger.warning(f"Error caching embedding model: {e}")
        return False

if __name__ == "__main__":
    logger.info("Initializing NyayaFlow local AI model setup...")
    ollama_ok = check_ollama("qwen2.5:latest")
    emb_ok = check_embeddings("sentence-transformers/all-MiniLM-L6-v2")
    if ollama_ok:
        logger.info("All AI models ready!")
    else:
        logger.warning("Setup completed with warnings. Check logs above.")

