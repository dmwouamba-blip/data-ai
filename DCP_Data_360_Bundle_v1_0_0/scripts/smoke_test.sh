#!/usr/bin/env bash
set -euo pipefail
U="${1:?app URL required}"
curl -fsS "$U/health" | grep -q '"status":"ok"'
curl -fsS "$U/api/patients" >/dev/null
