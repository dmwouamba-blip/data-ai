# Databricks notebook source
# MAGIC %md
# MAGIC # Versioned export of all accessible DCP AI/BI dashboards
# MAGIC
# MAGIC Each notebook execution creates a NEW timestamped subfolder under
# MAGIC `src/dashboard_files/exports/` and exports all dashboards visible to the
# MAGIC current authenticated identity into that snapshot folder.
# MAGIC
# MAGIC No dashboard IDs are hard-coded.

# COMMAND ----------
from databricks.sdk import WorkspaceClient
from pathlib import Path
from datetime import datetime, timezone
import json
import re

# COMMAND ----------
# Repository export root.
EXPORT_ROOT = Path(
    "/Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo/src/dashboard_files/exports"
)

# Optional: set to "DCP" to export only dashboard display names starting with DCP.
# Keep empty to export every dashboard returned by the Dashboard List API.
DISPLAY_NAME_PREFIX = "DCP"

# Create a unique snapshot folder for THIS execution.
# Microseconds avoid collisions when the notebook is executed more than once
# within the same second.
RUN_TIMESTAMP_UTC = datetime.now(timezone.utc)
EXPORT_RUN_ID = RUN_TIMESTAMP_UTC.strftime("%Y%m%dT%H%M%S_%fZ")
DESTINATION = EXPORT_ROOT / EXPORT_RUN_ID

# COMMAND ----------
def safe_filename(display_name: str, dashboard_id: str) -> str:
    """Create a stable, filesystem-safe dashboard filename."""
    value = (display_name or "dashboard").strip()
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_.") or "dashboard"
    return f"{value}__{dashboard_id[:8]}.lvdash.json"


def validate_dashboard_json(serialized_dashboard: str) -> dict:
    """Validate the API payload before writing it to the repository."""
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
DESTINATION.mkdir(parents=True, exist_ok=False)

print(f"Export run ID : {EXPORT_RUN_ID}")
print(f"Destination   : {DESTINATION}")
print(f"Name prefix   : {DISPLAY_NAME_PREFIX or '<all accessible dashboards>'}")

# COMMAND ----------
# Discover dashboards dynamically. The list operation supplies dashboard metadata;
# each dashboard is fetched with get() to obtain serialized_dashboard.
dashboards = list(w.dashboards.list())

if DISPLAY_NAME_PREFIX:
    dashboards = [
        dashboard
        for dashboard in dashboards
        if (dashboard.display_name or "").startswith(DISPLAY_NAME_PREFIX)
    ]

# Deterministic order makes snapshot comparisons easier.
dashboards = sorted(
    dashboards,
    key=lambda d: ((d.display_name or "").lower(), d.dashboard_id or ""),
)

print(f"Discovered {len(dashboards)} dashboard(s) eligible for export")

if not dashboards:
    raise RuntimeError("No dashboards matched the export criteria")

# COMMAND ----------
# Display the discovered inventory before export.
discovery_rows = [
    (
        dashboard.dashboard_id,
        dashboard.display_name,
        str(getattr(dashboard, "lifecycle_state", "")),
    )
    for dashboard in dashboards
]

display(
    spark.createDataFrame(
        discovery_rows,
        ["dashboard_id", "display_name", "lifecycle_state"],
    ).orderBy("display_name")
)

# COMMAND ----------
exported = []
failed = []

for listed_dashboard in dashboards:
    dashboard_id = listed_dashboard.dashboard_id

    try:
        dashboard = w.dashboards.get(dashboard_id)
        display_name = (dashboard.display_name or dashboard_id).strip()
        parsed = validate_dashboard_json(dashboard.serialized_dashboard)

        file_name = safe_filename(display_name, dashboard_id)
        output_path = DESTINATION / file_name

        output_path.write_text(
            json.dumps(parsed, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        # Read-back validation catches corrupt/incomplete writes.
        json.loads(output_path.read_text(encoding="utf-8"))

        export_record = {
            "dashboard_id": dashboard_id,
            "display_name": display_name,
            "file_name": file_name,
            "output_path": str(output_path),
            "bytes": output_path.stat().st_size,
        }
        exported.append(export_record)
        print(f"EXPORTED {display_name} -> {output_path}")

    except Exception as exc:
        failure_record = {
            "dashboard_id": dashboard_id,
            "display_name": listed_dashboard.display_name,
            "error": f"{type(exc).__name__}: {exc}",
        }
        failed.append(failure_record)
        print(
            f"FAILED {listed_dashboard.display_name or dashboard_id}: "
            f"{type(exc).__name__}: {exc}"
        )

# COMMAND ----------
# Write a manifest INTO the snapshot folder. This makes every execution
# self-describing and preserves both success and failure evidence.
manifest = {
    "export_run_id": EXPORT_RUN_ID,
    "exported_at_utc": RUN_TIMESTAMP_UTC.isoformat(),
    "display_name_prefix": DISPLAY_NAME_PREFIX,
    "discovered_count": len(dashboards),
    "exported_count": len(exported),
    "failed_count": len(failed),
    "destination": str(DESTINATION),
    "exported": exported,
    "failed": failed,
}

manifest_path = DESTINATION / "_export_manifest.json"
manifest_path.write_text(
    json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
json.loads(manifest_path.read_text(encoding="utf-8"))

print("\nExport summary")
print(json.dumps(manifest, indent=2, ensure_ascii=False))

# COMMAND ----------
# Fail closed AFTER writing the manifest so the snapshot retains evidence.
if failed:
    raise RuntimeError(
        f"Dashboard snapshot incomplete: {len(failed)} of "
        f"{len(dashboards)} dashboard(s) failed. "
        f"See {manifest_path}"
    )

if len(exported) != len(dashboards):
    raise RuntimeError(
        f"Expected {len(dashboards)} exports but wrote {len(exported)}"
    )

print(
    f"PASS: snapshot {EXPORT_RUN_ID} contains all "
    f"{len(exported)} dashboard(s)"
)

# COMMAND ----------
# MAGIC %md
# MAGIC ## Resulting repository layout
# MAGIC
# MAGIC Each execution creates a new immutable snapshot folder:
# MAGIC
# MAGIC ```text
# MAGIC src/dashboard_files/exports/
# MAGIC ├── 20261020T084700_123456Z/
# MAGIC │   ├── DCP_CIO_Executive__xxxxxxxx.lvdash.json
# MAGIC │   ├── DCP_Glucose_Management__xxxxxxxx.lvdash.json
# MAGIC │   ├── DCP_Patient_and_Consent__xxxxxxxx.lvdash.json
# MAGIC │   └── _export_manifest.json
# MAGIC └── 20261020T101500_654321Z/
# MAGIC     ├── ...
# MAGIC     └── _export_manifest.json
# MAGIC ```

# COMMAND ----------
# MAGIC %md
# MAGIC ## Git checkpoint
# MAGIC
# MAGIC From the repository root:
# MAGIC
# MAGIC ```bash
# MAGIC cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo
# MAGIC git status --short src/dashboard_files/exports
# MAGIC git add src/dashboard_files/exports
# MAGIC git diff --cached --stat
# MAGIC git commit -m "Add versioned Databricks dashboard snapshot"
# MAGIC git push origin $(git branch --show-current)
# MAGIC ```
# MAGIC
# MAGIC Because every execution writes to a new folder, Git history preserves
# MAGIC each exported snapshot independently. Apply repository retention later if
# MAGIC unlimited snapshot growth is not desired.
