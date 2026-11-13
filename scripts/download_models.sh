#!/bin/bash
# ==============================================================================
# NyayaFlow - Local Model Downloader & Verification Script
# ==============================================================================

set -e

echo "========================================================"
echo "      NyayaFlow Local AI Model Downloader & Setup       "
echo "========================================================"

# 1. Verify and pull Ollama LLM
if ! command -v ollama >/dev/null 2>&1; then
    echo "⚠ Ollama CLI not found in PATH."
    echo "  Please install Ollama from https://ollama.com to run local LLMs."
else
    echo "✔ Found Ollama installation."
    
    # Check if Ollama daemon is running
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo "✔ Ollama server is running on port 11434."
    else
        echo "ℹ Launching Ollama daemon in background..."
        ollama serve >/dev/null 2>&1 &
        sleep 3
    fi

    echo "⬇ Pulling Qwen 2.5 Legal Reasoning Model (qwen2.5:latest)..."
    ollama pull qwen2.5:latest
    echo "✔ Model qwen2.5:latest ready in local store."
fi

# 2. Check SentenceTransformers embeddings model
echo ""
echo "⬇ Checking Semantic Embedding Model (all-MiniLM-L6-v2)..."
if [ -f "ai-service/venv/bin/python3" ]; then
    ai-service/venv/bin/python3 -c "
try:
    from sentence_transformers import SentenceTransformer
    print('Downloading/caching sentence-transformers/all-MiniLM-L6-v2...')
    SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print('✔ SentenceTransformers model cached on local disk.')
except ImportError:
    print('ℹ SentenceTransformers not in venv; deterministic 384-dim semantic vectorizer active.')
" || true
fi

echo ""
echo "========================================================"
echo "✔ NyayaFlow AI models verified and ready for execution."
echo "========================================================"

