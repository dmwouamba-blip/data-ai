#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo "[i] Creating Python 3.11 venv..."
  python3.11 -m venv venv
fi
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

# Optionally build frontend if dist is missing (for local test)
PROJECT_ROOT="$(cd .. && pwd)"
FRONTEND_DIST="$PROJECT_ROOT/frontend/dist"
if [ ! -d "$FRONTEND_DIST" ]; then
  if command -v npm >/dev/null 2>&1; then
    echo "[i] Building frontend (vite)..."
    (cd "$PROJECT_ROOT/frontend" && npm ci && npm run build)
  else
    echo "[w] npm not found; skipping frontend build"
  fi
fi

export PYTHONPATH=$(pwd)
if [ "${USE_GUNICORN:-0}" = "1" ]; then
  exec gunicorn -k uvicorn.workers.UvicornWorker app.main:app -b 0.0.0.0:8000
else
  uvicorn app.main:app --reload --port 8000
fi

