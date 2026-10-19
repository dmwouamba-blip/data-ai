# Databricks notebook source
# MAGIC %md
# MAGIC # Export all accessible DCP AI/BI dashboards
# MAGIC
# MAGIC Automatically lists accessible draft AI/BI dashboards through the
# MAGIC Databricks Lakeview Dashboard API and exports each dashboard definition as
# MAGIC a `.lvdash.json` file into this repository.
# MAGIC
# MAGIC No dashboard IDs are hard-coded.

# COMMAND ----------
from databricks.sdk import WorkspaceClient
from pathlib import Path
import json
import re

# COMMAND ----------
# Export configuration.
DESTINATION = Path(
    "/Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo/src/dashboard_files"
)

# Optional display-name filter. Keep empty to export every dashboard returned
# by the Dashboard List API for the current identity.
DISPLAY_NAME_PREFIX = ""

# COMMAND ----------
def safe_filename(display_name: str, dashboard_id: str) -> str:
    """Create a stable Git-friendly .lvdash.json filename."""
    value = (display_name or "dashboard").strip()
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_.") or "dashboard"
    return f"{value}__{dashboard_id[:8]}.lvdash.json"


def validate_dashboard_json(serialized_dashboard: str) -> dict:
    """Validate a serialized dashboard before it is written to Git."""
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

# w.dashboards.list() retrieves dashboards visible to the current authenticated
# identity. The list response does not contain serialized_dashboard, therefore
# every listed dashboard is fetched again with get().
dashboards = list(w.dashboards.list())

if DISPLAY_NAME_PREFIX:
    dashboards = [
        dashboard
        for dashboard in dashboards
        if (dashboard.display_name or "").startswith(DISPLAY_NAME_PREFIX)
    ]

print(f"Discovered {len(dashboards)} dashboard(s) eligible for export")

if not dashboards:
    raise RuntimeError("No dashboards were returned by the Dashboard List API")

# COMMAND ----------
# Show discovered dashboards before export.
discovery_rows = []
for dashboard in dashboards:
    discovery_rows.append(
        (
            dashboard.dashboard_id,
            dashboard.display_name,
            str(getattr(dashboard, "lifecycle_state", "")),
        )
    )

if discovery_rows:
    display(
        spark.createDataFrame(
            discovery_rows,
            ["dashboard_id", "display_name", "lifecycle_state"],
        ).orderBy("display_name")
    )

# COMMAND ----------
exported = []
failed = []
expected_files = set()

for listed_dashboard in dashboards:
    dashboard_id = listed_dashboard.dashboard_id

    try:
        # Get is required because serialized_dashboard is excluded from list
        # responses by the API contract.
        dashboard = w.dashboards.get(dashboard_id)

        display_name = (dashboard.display_name or dashboard_id).strip()
        parsed = validate_dashboard_json(dashboard.serialized_dashboard)

        file_name = safe_filename(display_name, dashboard_id)
        output_path = DESTINATION / file_name
        expected_files.add(file_name)

        output_path.write_text(
            json.dumps(parsed, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        # Read-back validation catches incomplete or corrupt writes.
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
                "display_name": listed_dashboard.display_name,
                "error": f"{type(exc).__name__}: {exc}",
            }
        )
        print(
            f"FAILED {listed_dashboard.display_name or dashboard_id}: "
            f"{type(exc).__name__}: {exc}"
        )

# COMMAND ----------
# Export summary.
summary = {
    "discovered_count": len(dashboards),
    "exported_count": len(exported),
    "failed_count": len(failed),
    "destination": str(DESTINATION),
    "exported": exported,
    "failed": failed,
}

print(json.dumps(summary, indent=2, ensure_ascii=False))

if failed:
    raise RuntimeError(
        f"Dashboard export incomplete: {len(failed)} of "
        f"{len(dashboards)} dashboard(s) failed"
    )

if len(exported) != len(dashboards):
    raise RuntimeError(
        f"Expected {len(dashboards)} exports but wrote {len(exported)}"
    )

print(
    f"PASS: exported all {len(exported)} accessible dashboard(s) "
    f"to {DESTINATION}"
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Git checkpoint
# MAGIC
# MAGIC Review exports before committing them:
# MAGIC
# MAGIC ```bash
# MAGIC cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo
# MAGIC git status --short src/dashboard_files
# MAGIC git diff -- src/dashboard_files
# MAGIC git add src/dashboard_files
# MAGIC git diff --cached -- src/dashboard_files
# MAGIC git commit -m "Export Databricks AI BI dashboards"
# MAGIC git push origin $(git branch --show-current)
# MAGIC ```
# MAGIC
# MAGIC The exported definitions are draft dashboard definitions. Publishing and
# MAGIC scheduling configuration should be managed separately.
