cd /Users/sevann.bereau/Documents/Github/etrm-data-360
set -euo pipefail

# frontend
cd frontend
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run dev &

# open browser
sleep 1
open http://localhost:5173