#!/usr/bin/env bash
set -euo pipefail
python -m compileall src synthetic tests app/backend
python -m pytest -q tests/unit
for T in dev test prod; do databricks bundle validate -t "$T"; done
