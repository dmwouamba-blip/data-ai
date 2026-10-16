# Databricks notebook source
# MAGIC %md
# MAGIC # Validate Full Refresh
# MAGIC
# MAGIC Post-refresh validation gate for the guarded Full Refresh workflow.
# MAGIC
# MAGIC The notebook:
# MAGIC - receives the `backup_set_id` created before the refresh;
# MAGIC - verifies that the backup set was validated and released for refresh;
# MAGIC - validates the configured protected source objects after the refresh;
# MAGIC - checks object readability, non-empty state, and schema compatibility with the pre-refresh schema snapshot;
# MAGIC - marks the refresh `SUCCESS` only when every required validation passes;
# MAGIC - marks the refresh `FAILED` and raises an exception on validation failure;
# MAGIC - records audit evidence and publishes task values for downstream retention.

# COMMAND ----------
from __future__ import annotations

import json
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from pyspark.sql import functions as F

# COMMAND ----------
# Parameters. The guarded job should pass backup_set_id from create_validate_backup.
dbutils.widgets.text("environment", "dev", "Environment")
dbutils.widgets.text("backup_catalog", "dcp_synth_backup", "Backup catalog")
dbutils.widgets.text("admin_schema", "admin", "Backup admin schema")
dbutils.widgets.text("backup_set_id", "", "Backup set ID")
dbutils.widgets.dropdown("require_non_empty", "true", ["true", "false"], "Require non-empty objects")
dbutils.widgets.dropdown("validate_schema", "true", ["true", "false"], "Validate schema")

ENVIRONMENT = dbutils.widgets.get("environment").strip()
BACKUP_CATALOG = dbutils.widgets.get("backup_catalog").strip()
ADMIN_SCHEMA = dbutils.widgets.get("admin_schema").strip()
BACKUP_SET_ID = dbutils.widgets.get("backup_set_id").strip()
REQUIRE_NON_EMPTY = dbutils.widgets.get("require_non_empty").strip().lower() == "true"
VALIDATE_SCHEMA = dbutils.widgets.get("validate_schema").strip().lower() == "true"

if not BACKUP_SET_ID:
    raise ValueError(
        "backup_set_id is required. Pass the value produced by create_validate_backup.py "
        "to this notebook task."
    )

# COMMAND ----------
# Identifier safety for metadata table names.
IDENTIFIER_PART = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def require_identifier_part(value: str, label: str) -> str:
    if not IDENTIFIER_PART.fullmatch(value):
        raise ValueError(f"Unsafe or unsupported {label}: {value!r}")
    return value


def quote_part(value: str) -> str:
    require_identifier_part(value, "identifier")
    return f"`{value}`"


def quote_fqn(fqn: str) -> str:
    parts = fqn.split(".")
    if len(parts) not in (2, 3):
        raise ValueError(f"Expected two- or three-part object name, got {fqn!r}")
    return ".".join(quote_part(part) for part in parts)


require_identifier_part(BACKUP_CATALOG, "backup_catalog")
require_identifier_part(ADMIN_SCHEMA, "admin_schema")

ADMIN_FQN = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}"
BACKUP_SETS = f"{ADMIN_FQN}.backup_sets"
BACKUP_OBJECTS = f"{ADMIN_FQN}.backup_objects"
BACKUP_CONFIG = f"{ADMIN_FQN}.backup_object_config"
EXECUTION_LOG = f"{ADMIN_FQN}.backup_execution_log"

print(
    json.dumps(
        {
            "environment": ENVIRONMENT,
            "backup_set_id": BACKUP_SET_ID,
            "backup_catalog": BACKUP_CATALOG,
            "require_non_empty": REQUIRE_NON_EMPTY,
            "validate_schema": VALIDATE_SCHEMA,
        },
        indent=2,
    )
)

# COMMAND ----------
# Foundation preflight.
required_tables = [BACKUP_SETS, BACKUP_OBJECTS, BACKUP_CONFIG, EXECUTION_LOG]
missing_tables = [name for name in required_tables if not spark.catalog.tableExists(name)]
if missing_tables:
    raise RuntimeError(
        "Full-refresh validation cannot start. Missing backup administration table(s): "
        + ", ".join(missing_tables)
    )

required_columns = {
    BACKUP_SETS: {
        "backup_set_id",
        "environment",
        "validation_status",
        "refresh_status",
        "error_message",
        "completed_at",
        "updated_at",
    },
    BACKUP_OBJECTS: {
        "backup_set_id",
        "source_object",
        "backup_object",
        "source_schema_json",
        "validation_status",
    },
    BACKUP_CONFIG: {
        "source_object",
        "enabled",
        "criticality",
    },
    EXECUTION_LOG: {
        "execution_id",
        "backup_set_id",
        "step_name",
        "status",
        "message",
        "executed_at",
    },
}

for table_name, expected in required_columns.items():
    actual = set(spark.table(table_name).columns)
    missing = sorted(expected - actual)
    if missing:
        raise RuntimeError(
            f"{table_name} is missing required column(s): {', '.join(missing)}. "
            "Align this notebook with the deployed backup foundation before continuing."
        )

# COMMAND ----------
def audit(status: str, message: str) -> None:
    """Write one append-only audit record without embedding data values in SQL."""
    row = [
        (
            str(uuid.uuid4()),
            BACKUP_SET_ID,
            "validate_full_refresh",
            status,
            message[:4000],
        )
    ]
    (
        spark.createDataFrame(
            row,
            "execution_id string, backup_set_id string, step_name string, status string, message string",
        )
        .withColumn("executed_at", F.current_timestamp())
        .write.mode("append")
        .saveAsTable(EXECUTION_LOG)
    )


def update_backup_set(refresh_status: str, error_message: Optional[str]) -> None:
    """Safely update the backup-set refresh state using a one-row temporary relation."""
    spark.createDataFrame(
        [(BACKUP_SET_ID, refresh_status, error_message)],
        "backup_set_id string, refresh_status string, error_message string",
    ).createOrReplaceTempView("refresh_validation_status_update")

    spark.sql(
        f"""
        MERGE INTO {quote_fqn(BACKUP_SETS)} AS t
        USING refresh_validation_status_update AS s
        ON t.backup_set_id = s.backup_set_id
        WHEN MATCHED THEN UPDATE SET
          t.refresh_status = s.refresh_status,
          t.error_message = s.error_message,
          t.updated_at = current_timestamp()
        """
    )


def schema_json_for_table(table_name: str) -> str:
    """Return deterministic Spark StructType JSON for a table."""
    return spark.table(table_name).schema.json()


def normalize_schema_json(value: Optional[str]) -> Optional[Dict[str, Any]]:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return None


def comparable_schema(value: Optional[str]) -> Optional[List[Tuple[str, str, bool]]]:
    """
    Convert Spark schema JSON to a stable comparison structure.
    We compare field name, data type representation, and nullability.
    """
    parsed = normalize_schema_json(value)
    if not parsed or "fields" not in parsed:
        return None
    result: List[Tuple[str, str, bool]] = []
    for field in parsed["fields"]:
        result.append(
            (
                str(field.get("name")),
                json.dumps(field.get("type"), sort_keys=True),
                bool(field.get("nullable")),
            )
        )
    return result

# COMMAND ----------
# Validate backup-set prerequisite state.
set_rows = (
    spark.table(BACKUP_SETS)
    .where(F.col("backup_set_id") == BACKUP_SET_ID)
    .select(
        "backup_set_id",
        "environment",
        "validation_status",
        "refresh_status",
        "retention_status" if "retention_status" in spark.table(BACKUP_SETS).columns else F.lit(None).alias("retention_status"),
    )
    .collect()
)

if len(set_rows) != 1:
    raise RuntimeError(
        f"Expected exactly one backup_sets record for backup_set_id={BACKUP_SET_ID!r}; "
        f"found {len(set_rows)}"
    )

backup_set = set_rows[0]

if backup_set["environment"] != ENVIRONMENT:
    raise RuntimeError(
        f"Environment mismatch for backup set {BACKUP_SET_ID}: "
        f"expected={ENVIRONMENT!r}, actual={backup_set['environment']!r}"
    )

if backup_set["validation_status"] != "VALIDATED":
    raise RuntimeError(
        f"Full-refresh validation blocked: backup set {BACKUP_SET_ID} is not VALIDATED "
        f"(actual={backup_set['validation_status']!r})"
    )

if backup_set["refresh_status"] not in ("READY_FOR_REFRESH", "RUNNING", "VALIDATING"):
    raise RuntimeError(
        f"Full-refresh validation blocked: unexpected refresh_status={backup_set['refresh_status']!r}. "
        "Expected READY_FOR_REFRESH, RUNNING, or VALIDATING before post-refresh validation."
    )

update_backup_set("VALIDATING", None)
audit("STARTED", "Post-refresh validation started")

# COMMAND ----------
# Build the required validation inventory from the enabled backup configuration.
config_df = (
    spark.table(BACKUP_CONFIG)
    .where(F.col("enabled") == True)
    .select("source_object", "criticality")
)

configured = config_df.collect()
if not configured:
    update_backup_set("FAILED", "No enabled backup objects configured")
    audit("FAILED", "No enabled backup objects configured")
    raise RuntimeError("No enabled backup objects configured")

# Pre-refresh object evidence must exist for every object in this backup set.
pre_refresh_df = (
    spark.table(BACKUP_OBJECTS)
    .where(F.col("backup_set_id") == BACKUP_SET_ID)
    .select(
        "source_object",
        "backup_object",
        "source_schema_json",
        "validation_status",
    )
)

pre_refresh_rows = pre_refresh_df.collect()
pre_refresh_by_source = {row["source_object"]: row for row in pre_refresh_rows}

missing_backup_evidence = [
    row["source_object"]
    for row in configured
    if row["source_object"] not in pre_refresh_by_source
]
if missing_backup_evidence:
    message = "Missing pre-refresh backup evidence for: " + ", ".join(sorted(missing_backup_evidence))
    update_backup_set("FAILED", message)
    audit("FAILED", message)
    raise RuntimeError(message)

# COMMAND ----------
# Validate each protected source object after the Full Refresh.
results: List[Dict[str, Any]] = []

for config_row in configured:
    source_object = config_row["source_object"]
    criticality = config_row["criticality"]
    backup_evidence = pre_refresh_by_source[source_object]

    result: Dict[str, Any] = {
        "source_object": source_object,
        "criticality": criticality,
        "status": "PASS",
        "row_count": None,
        "schema_status": "NOT_REQUESTED" if not VALIDATE_SCHEMA else "PENDING",
        "message": None,
    }

    try:
        if backup_evidence["validation_status"] != "VALIDATED":
            raise RuntimeError(
                f"Pre-refresh backup object was not VALIDATED "
                f"(actual={backup_evidence['validation_status']!r})"
            )

        if not spark.catalog.tableExists(source_object):
            raise RuntimeError("Source object does not exist after Full Refresh")

        refreshed_df = spark.table(source_object)
        row_count = refreshed_df.count()
        result["row_count"] = row_count

        if REQUIRE_NON_EMPTY and row_count <= 0:
            raise RuntimeError("Source object is empty after Full Refresh")

        if VALIDATE_SCHEMA:
            expected_schema = comparable_schema(backup_evidence["source_schema_json"])
            actual_schema_json = refreshed_df.schema.json()
            actual_schema = comparable_schema(actual_schema_json)

            if expected_schema is None:
                raise RuntimeError(
                    "Pre-refresh schema evidence is missing or invalid; cannot perform schema validation"
                )

            if actual_schema != expected_schema:
                result["schema_status"] = "MISMATCH"
                raise RuntimeError(
                    "Post-refresh schema differs from the validated pre-refresh schema"
                )

            result["schema_status"] = "MATCH"

        result["message"] = "Object exists, is readable, and passed configured validation"

    except Exception as exc:
        result["status"] = "FAIL"
        result["message"] = str(exc)[:3000]
        if result["schema_status"] == "PENDING":
            result["schema_status"] = "NOT_VALIDATED"

    results.append(result)

# COMMAND ----------
# Display detailed evidence in the run output.
results_df = spark.createDataFrame(
    [
        (
            r["source_object"],
            r["criticality"],
            r["status"],
            r["row_count"],
            r["schema_status"],
            r["message"],
        )
        for r in results
    ],
    "source_object string, criticality string, status string, row_count long, schema_status string, message string",
)

display(results_df.orderBy("criticality", "source_object"))

failed = [r for r in results if r["status"] != "PASS"]
critical_failures = [r for r in failed if r["criticality"] == "CRITICAL"]

validated_count = len(results) - len(failed)
configured_count = len(results)

# COMMAND ----------
# Fail closed on any enabled protected object failure.
if failed:
    failure_summary = "; ".join(
        f"{r['source_object']}: {r['message']}" for r in failed
    )
    message = (
        f"Full Refresh validation failed: {len(failed)}/{configured_count} object(s) failed; "
        f"critical_failures={len(critical_failures)}. {failure_summary}"
    )[:4000]

    update_backup_set("FAILED", message)
    audit("FAILED", message)

    dbutils.jobs.taskValues.set(key="refresh_validation_status", value="FAILED")
    dbutils.jobs.taskValues.set(key="validated_refresh_object_count", value=validated_count)
    dbutils.jobs.taskValues.set(key="failed_refresh_object_count", value=len(failed))
    dbutils.jobs.taskValues.set(key="critical_refresh_failure_count", value=len(critical_failures))

    raise RuntimeError(message)

# COMMAND ----------
# Success: release the backup set to downstream retention.
message = (
    f"Full Refresh validation succeeded: {validated_count}/{configured_count} "
    "configured object(s) passed"
)

update_backup_set("SUCCESS", None)
audit("SUCCEEDED", message)

dbutils.jobs.taskValues.set(key="backup_set_id", value=BACKUP_SET_ID)
dbutils.jobs.taskValues.set(key="refresh_validation_status", value="SUCCESS")
dbutils.jobs.taskValues.set(key="validated_refresh_object_count", value=validated_count)
dbutils.jobs.taskValues.set(key="failed_refresh_object_count", value=0)
dbutils.jobs.taskValues.set(key="critical_refresh_failure_count", value=0)

# COMMAND ----------
# Final operator-readable summary.
summary = {
    "backup_set_id": BACKUP_SET_ID,
    "environment": ENVIRONMENT,
    "status": "SUCCESS",
    "validated_objects": validated_count,
    "configured_objects": configured_count,
    "failed_objects": 0,
    "critical_failures": 0,
    "schema_validation": VALIDATE_SCHEMA,
    "require_non_empty": REQUIRE_NON_EMPTY,
}

print(json.dumps(summary, indent=2))

# Keep the final output machine-readable for job/API consumers.
dbutils.notebook.exit(json.dumps(summary))
