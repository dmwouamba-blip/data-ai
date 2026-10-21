cd /Users/sevann.bereau/Documents/Github/etrm-data-360
set -euo pipefail

# python 3.11 venv (local)
if [ ! -d ".venv" ]; then
  python3.11 -m venv .venv || python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

# run backend (fix module path by setting app-dir to backend)
uvicorn --app-dir backend app.main:app --reload --host 0.0.0.0 --port 8000

# open backend
open http://localhost:8000