#!/bin/bash
# ==============================================================================
# NyayaFlow - Local Development Startup Script
# ==============================================================================

set -e

echo "========================================================"
echo "          Starting NyayaFlow Local Environment          "
echo "========================================================"

# Check if PostgreSQL is reachable
echo "1. Checking PostgreSQL..."
if psql -h localhost -U $(whoami) -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✔ PostgreSQL is running."
    # Ensure database exists
    psql -h localhost -U $(whoami) -d postgres -c "CREATE DATABASE nyayaflow_db;" >/dev/null 2>&1 || true
    echo "   ✔ Ensuring database nyayaflow_db exists."
else
    echo "   ⚠ Note: Local PostgreSQL on port 5432 not reachable without credentials or Docker."
    echo "   If using Docker, run: docker compose up --build instead."
fi

# Run migrations and seeds
echo "2. Initializing Database Schema & Seed Data..."
(cd backend && node src/scripts/migrate.js || true)
(cd backend && node src/scripts/seed.js || true)

echo "3. Generating Synthetic Demo PDFs..."
(cd backend && node src/scripts/generateDemoPdfs.js)

echo ""
echo "========================================================"
echo "  To launch all services, run in separate terminals:"
echo ""
echo "  Terminal 1 (Local Ollama Engine):"
echo "    ollama serve"
echo ""
echo "  Terminal 2 (AI Microservice):"
echo "    cd ai-service && venv/bin/python3 -m uvicorn app.main:app --port 8000 --reload"
echo ""
echo "  Terminal 3 (Backend API):"
echo "    cd backend && npm start"
echo ""
echo "  Terminal 4 (React Frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  OR with Docker (everything in 1 command):"
echo "    docker compose up --build"
echo "========================================================"
