#!/usr/bin/env bash
set -euo pipefail
T="${1:-dev}"
case "$T" in dev|test|prod);;*) echo "target must be dev, test or prod" >&2; exit 2;; esac
databricks bundle validate -t "$T"
databricks bundle deploy -t "$T"
databricks bundle run dcp_pipeline -t "$T"
databricks bundle run dcp_app -t "$T"
databricks bundle summary -t "$T"
