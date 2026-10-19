# Databricks notebook source
# MAGIC %md
# MAGIC # Export all DCP AI/BI dashboards
# MAGIC
# MAGIC Exports the configured Databricks AI/BI dashboard drafts as `.lvdash.json`
# MAGIC files into the repository folder `src/dashboard_files`.
# MAGIC
# MAGIC The Lakeview Dashboard API returns the draft dashboard definition through
# MAGIC `serialized_dashboard`. This notebook validates the JSON before writing it.

# COMMAND ----------
from databricks.sdk import WorkspaceClient
from pathlib import Path
import json
import re

# COMMAND ----------
# Dashboard IDs to export.
DASHBOARD_IDS = [
    "01f1cbd2dee512c2bb74a43648d62162",
    "01f1cbcff0a01cf38479dcfbf16d1081",
    "01f1cbd155b618debe3e5bd4b53b41f2",
    "01f1cbccc7df17219ddf2e03d863022e",
    "01f1cbc4211c178d869b87d8ded5823f",
]

DESTINATION = Path(
    "/Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo/src/dashboard_files"
)

# COMMAND ----------
def safe_filename(display_name: str) -> str:
    """Convert a dashboard display name into a Git-friendly filename."""
    value = display_name.strip()
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_.")
    return value or "dashboard"


def validate_serialized_dashboard(serialized_dashboard: str) -> dict:
    """Fail before writing when the API did not return valid dashboard JSON."""
    if not serialized_dashboard or not serialized_dashboard.strip():
        raise ValueError("serialized_dashboard is empty")

    parsed = json.loads(serialized_dashboard)

    if not isinstance(parsed, dict):
        raise ValueError("serialized_dashboard is not a JSON object")

    if "pages" not in parsed:
        raise ValueError("serialized_dashboard does not contain 'pages'")

    return parsed

# COMMAND ----------
w = WorkspaceClient()
DESTINATION.mkdir(parents=True, exist_ok=True)

exported = []
failed = []
seen_names = set()

for dashboard_id in DASHBOARD_IDS:
    try:
        dashboard = w.dashboards.get(dashboard_id)

        display_name = (dashboard.display_name or dashboard_id).strip()
        serialized = dashboard.serialized_dashboard
        parsed = validate_serialized_dashboard(serialized)

        base_name = safe_filename(display_name)
        file_name = f"{base_name}.lvdash.json"

        # Protect against two dashboards resolving to the same filename.
        if file_name.lower() in seen_names:
            file_name = f"{base_name}_{dashboard_id[:8]}.lvdash.json"
        seen_names.add(file_name.lower())

        output_path = DESTINATION / file_name

        # Re-serialize through json.dumps for valid UTF-8 formatted JSON while
        # preserving the dashboard definition semantically.
        output_path.write_text(
            json.dumps(parsed, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        # Read-back validation catches filesystem/write corruption immediately.
        json.loads(output_path.read_text(encoding="utf-8"))

        exported.append(
            {
                "dashboard_id": dashboard_id,
                "display_name": display_name,
                "output_path": str(output_path),
                "bytes": output_path.stat().st_size,
            }
        )

        print(f"EXPORTED {display_name} -> {output_path}")

    except Exception as exc:
        failed.append(
            {
                "dashboard_id": dashboard_id,
                "error": f"{type(exc).__name__}: {exc}",
            }
        )
        print(
            f"FAILED {dashboard_id}: "
            f"{type(exc).__name__}: {exc}"
        )

# COMMAND ----------
print("\nExport summary")
print(json.dumps({"exported": exported, "failed": failed}, indent=2))

if failed:
    raise RuntimeError(
        f"Dashboard export incomplete: "
        f"{len(failed)} of {len(DASHBOARD_IDS)} dashboard(s) failed"
    )

if len(exported) != len(DASHBOARD_IDS):
    raise RuntimeError(
        f"Expected {len(DASHBOARD_IDS)} exports, got {len(exported)}"
    )

print(
    f"PASS: exported {len(exported)} dashboard(s) "
    f"to {DESTINATION}"
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Git checkpoint
# MAGIC
# MAGIC After a successful export, review and commit from the repository root:
# MAGIC
# MAGIC ```bash
# MAGIC cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo
# MAGIC git status
# MAGIC git diff -- src/dashboard_files
# MAGIC git add src/dashboard_files
# MAGIC git diff --cached -- src/dashboard_files
# MAGIC git commit -m "Export Databricks AI BI dashboards"
# MAGIC git push origin $(git branch --show-current)
# MAGIC ```
