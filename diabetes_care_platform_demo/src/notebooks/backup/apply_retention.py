# Databricks notebook source
# MAGIC %md
# MAGIC # Apply Backup Retention
# MAGIC
# MAGIC Applies the retention policy **only after a successful guarded refresh**.
# MAGIC
# MAGIC Default policy: keep the newest two validated recovery points, remove physical
# MAGIC backup tables belonging to older validated sets, and retain audit metadata.
# MAGIC
# MAGIC Safety properties:
# MAGIC - fails closed when prerequisite tables or columns are missing;
# MAGIC - validates identifiers before dynamic SQL;
# MAGIC - never treats PENDING/FAILED backup sets as retention candidates;
# MAGIC - never drops the current backup set;
# MAGIC - records object-level and execution-level outcomes;
# MAGIC - deletion is idempotent (`DROP TABLE IF EXISTS`);
# MAGIC - supports dry-run mode for operational verification.

# COMMAND ----------
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Iterable, List, Dict, Any

from pyspark.sql import functions as F

# COMMAND ----------
# Parameters. Job parameters can override widget defaults.
dbutils.widgets.text("backup_catalog", "dcp_synth_backup", "Backup catalog")
dbutils.widgets.text("admin_schema", "admin", "Admin schema")
dbutils.widgets.text("backup_set_id", "", "Current backup set ID")
dbutils.widgets.text("keep_validated_sets", "2", "Validated sets to retain")
dbutils.widgets.dropdown("dry_run", "false", ["false", "true"], "Dry run")

BACKUP_CATALOG = dbutils.widgets.get("backup_catalog").strip()
ADMIN_SCHEMA = dbutils.widgets.get("admin_schema").strip()
CURRENT_BACKUP_SET_ID = dbutils.widgets.get("backup_set_id").strip()
KEEP_VALIDATED_SETS = int(dbutils.widgets.get("keep_validated_sets"))
DRY_RUN = dbutils.widgets.get("dry_run").strip().lower() == "true"

if KEEP_VALIDATED_SETS < 1:
    raise ValueError("keep_validated_sets must be >= 1")

# COMMAND ----------
# Identifier helpers. Only catalog/schema/table-component characters are accepted.
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
        raise ValueError(f"Expected two- or three-part identifier, got: {fqn!r}")
    return ".".join(quote_part(p) for p in parts)


require_identifier_part(BACKUP_CATALOG, "backup_catalog")
require_identifier_part(ADMIN_SCHEMA, "admin_schema")

ADMIN_FQN = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}"
BACKUP_SETS = f"{ADMIN_FQN}.backup_sets"
BACKUP_OBJECTS = f"{ADMIN_FQN}.backup_objects"
EXECUTION_LOG = f"{ADMIN_FQN}.backup_execution_log"

print(json.dumps({
    "backup_catalog": BACKUP_CATALOG,
    "admin_schema": ADMIN_SCHEMA,
    "current_backup_set_id": CURRENT_BACKUP_SET_ID or None,
    "keep_validated_sets": KEEP_VALIDATED_SETS,
    "dry_run": DRY_RUN,
}, indent=2))

# COMMAND ----------
# Preflight validation.
required_tables = [BACKUP_SETS, BACKUP_OBJECTS, EXECUTION_LOG]
missing_tables = [t for t in required_tables if not spark.catalog.tableExists(t)]
if missing_tables:
    raise RuntimeError("Missing backup administration table(s): " + ", ".join(missing_tables))

required_columns = {
    BACKUP_SETS: {
        "backup_set_id",
        "validation_status",
        "refresh_status",
        "retention_status",
        "started_at",
        "deleted_at",
        "updated_at",
    },
    BACKUP_OBJECTS: {
        "backup_set_id",
        "backup_object",
        "validation_status",
        "error_details",
        "updated_at",
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
            "Align the retention notebook with the deployed backup foundation before running it."
        )

# COMMAND ----------
def log_event(backup_set_id: str, status: str, message: str) -> None:
    """Append one retention event without interpolating user values into SQL."""
    rows = [(str(__import__('uuid').uuid4()), backup_set_id, "APPLY_RETENTION", status, message[:4000])]
    (
        spark.createDataFrame(
            rows,
            "execution_id string, backup_set_id string, step_name string, status string, message string",
        )
        .withColumn("executed_at", F.current_timestamp())
        .write.mode("append")
        .saveAsTable(EXECUTION_LOG)
    )


def current_set_guard() -> None:
    """When a current set is supplied, require it to be a successfully refreshed validated set."""
    if not CURRENT_BACKUP_SET_ID:
        return
    rows = (
        spark.table(BACKUP_SETS)
        .where(F.col("backup_set_id") == CURRENT_BACKUP_SET_ID)
        .select("backup_set_id", "validation_status", "refresh_status", "retention_status")
        .collect()
    )
    if len(rows) != 1:
        raise RuntimeError(
            f"Expected exactly one backup_sets row for current backup_set_id={CURRENT_BACKUP_SET_ID!r}; "
            f"found {len(rows)}"
        )
    row = rows[0]
    if row["validation_status"] != "VALIDATED":
        raise RuntimeError(
            f"Retention blocked: current set {CURRENT_BACKUP_SET_ID} is not VALIDATED "
            f"(actual={row['validation_status']!r})"
        )
    if row["refresh_status"] != "SUCCESS":
        raise RuntimeError(
            f"Retention blocked: current set {CURRENT_BACKUP_SET_ID} refresh_status must be SUCCESS "
            f"(actual={row['refresh_status']!r})"
        )


current_set_guard()

# COMMAND ----------
# Select candidates deterministically. Only successfully refreshed, VALIDATED sets are considered.
# Already-DELETED sets are excluded. Newest sets are retained; ties are broken by backup_set_id.
eligible = (
    spark.table(BACKUP_SETS)
    .where(F.col("validation_status") == "VALIDATED")
    .where(F.col("refresh_status") == "SUCCESS")
    .where((F.col("retention_status").isNull()) | (F.col("retention_status") != "DELETED"))
    .select("backup_set_id", "started_at", "retention_status")
    .orderBy(F.col("started_at").desc_nulls_last(), F.col("backup_set_id").desc())
)

eligible_rows = eligible.collect()
retained_ids = [r["backup_set_id"] for r in eligible_rows[:KEEP_VALIDATED_SETS]]
candidate_ids = [r["backup_set_id"] for r in eligible_rows[KEEP_VALIDATED_SETS:]]

# Absolute protection for the backup created by the current guarded workflow.
if CURRENT_BACKUP_SET_ID and CURRENT_BACKUP_SET_ID in candidate_ids:
    raise RuntimeError(
        "Retention safety check failed: the current backup set was selected for deletion. "
        "No retention changes were applied."
    )

summary = {
    "eligible_validated_sets": len(eligible_rows),
    "retained_backup_set_ids": retained_ids,
    "retention_candidate_ids": candidate_ids,
    "dry_run": DRY_RUN,
}
print(json.dumps(summary, indent=2, default=str))

# COMMAND ----------
# Nothing to remove is a successful, idempotent outcome.
if not candidate_ids:
    message = (
        f"No retention candidates. Eligible validated sets={len(eligible_rows)}; "
        f"policy keeps newest {KEEP_VALIDATED_SETS}."
    )
    print(message)
    if CURRENT_BACKUP_SET_ID:
        log_event(CURRENT_BACKUP_SET_ID, "SKIPPED", message)
    dbutils.jobs.taskValues.set(key="retention_status", value="NO_ACTION")
    dbutils.jobs.taskValues.set(key="deleted_backup_set_count", value=0)
    dbutils.jobs.taskValues.set(key="deleted_backup_object_count", value=0)
    dbutils.jobs.taskValues.set(key="retained_backup_set_ids", value=retained_ids)
    dbutils.notebook.exit(json.dumps({**summary, "status": "NO_ACTION", "deleted_backup_set_count": 0, "deleted_backup_object_count": 0}))

# COMMAND ----------
# Materialize candidate object inventory before making changes.
objects_df = (
    spark.table(BACKUP_OBJECTS)
    .where(F.col("backup_set_id").isin(candidate_ids))
    .select("backup_set_id", "backup_object", "validation_status")
    .orderBy("backup_set_id", "backup_object")
)

objects = objects_df.collect()
invalid_objects = [r for r in objects if not r["backup_object"]]
if invalid_objects:
    raise RuntimeError("Retention blocked: one or more candidate backup_objects rows have an empty backup_object")

# Reject duplicate physical-object registration across candidate rows. This prevents accidental repeated ownership.
object_names = [r["backup_object"] for r in objects]
duplicates = sorted({x for x in object_names if object_names.count(x) > 1})
if duplicates:
    raise RuntimeError("Retention blocked: duplicate physical backup object registration: " + ", ".join(duplicates))

print(f"Physical backup objects selected: {len(objects)}")
for row in objects:
    print(f"  {row['backup_set_id']} -> {row['backup_object']}")

# COMMAND ----------
# Dry-run stops before DROP/UPDATE operations.
if DRY_RUN:
    if CURRENT_BACKUP_SET_ID:
        log_event(
            CURRENT_BACKUP_SET_ID,
            "DRY_RUN",
            f"Retention dry run: candidates={candidate_ids}; physical_objects={len(objects)}",
        )
    dbutils.jobs.taskValues.set(key="retention_status", value="DRY_RUN")
    dbutils.jobs.taskValues.set(key="deleted_backup_set_count", value=0)
    dbutils.jobs.taskValues.set(key="deleted_backup_object_count", value=0)
    dbutils.jobs.taskValues.set(key="retained_backup_set_ids", value=retained_ids)
    dbutils.notebook.exit(json.dumps({**summary, "status": "DRY_RUN", "physical_object_count": len(objects)}))

# COMMAND ----------
# Execute retention one backup set at a time.
# Important: DDL and registry updates are not one cross-object ACID transaction. Therefore every physical
# drop is recorded and failures stop the process, leaving enough metadata to repair/re-run idempotently.
deleted_sets = 0
deleted_objects = 0
failures: List[Dict[str, Any]] = []

for backup_set_id in candidate_ids:
    set_objects = [r for r in objects if r["backup_set_id"] == backup_set_id]
    log_event(backup_set_id, "STARTED", f"Retention started for {len(set_objects)} physical object(s)")

    set_failed = False
    for row in set_objects:
        backup_object = row["backup_object"]
        try:
            safe_name = quote_fqn(backup_object)
            spark.sql(f"DROP TABLE IF EXISTS {safe_name}")
            deleted_objects += 1
            log_event(backup_set_id, "OBJECT_DELETED", f"Dropped {backup_object}")
        except Exception as exc:
            set_failed = True
            error = f"Failed dropping {backup_object}: {str(exc)[:3000]}"
            failures.append({"backup_set_id": backup_set_id, "backup_object": backup_object, "error": str(exc)[:3000]})
            log_event(backup_set_id, "FAILED", error)

            # Preserve failure evidence on the registry row without deleting metadata.
            (
                spark.table(BACKUP_OBJECTS)
                .where((F.col("backup_set_id") == backup_set_id) & (F.col("backup_object") == backup_object))
            )
            # Update through a temporary single-row relation to avoid SQL literal interpolation.
            spark.createDataFrame([(backup_set_id, backup_object, error)], "backup_set_id string, backup_object string, error_details string").createOrReplaceTempView("retention_object_failure")
            spark.sql(f"""
                MERGE INTO {quote_fqn(BACKUP_OBJECTS)} AS t
                USING retention_object_failure AS s
                ON t.backup_set_id = s.backup_set_id AND t.backup_object = s.backup_object
                WHEN MATCHED THEN UPDATE SET
                  t.error_details = s.error_details,
                  t.updated_at = current_timestamp()
            """)
            break

    if set_failed:
        # Do not mark the set DELETED if any physical object failed to drop.
        continue

    # All registered physical objects for this set were dropped successfully.
    spark.createDataFrame([(backup_set_id,)], "backup_set_id string").createOrReplaceTempView("retention_deleted_set")
    spark.sql(f"""
        MERGE INTO {quote_fqn(BACKUP_SETS)} AS t
        USING retention_deleted_set AS s
        ON t.backup_set_id = s.backup_set_id
        WHEN MATCHED THEN UPDATE SET
          t.retention_status = 'DELETED',
          t.deleted_at = current_timestamp(),
          t.updated_at = current_timestamp()
    """)
    deleted_sets += 1
    log_event(backup_set_id, "SUCCEEDED", f"Retention completed; physical objects removed={len(set_objects)}")

# COMMAND ----------
# Post-retention validation.
# No successfully deleted set may still have a physical backup table present in Unity Catalog.
def exists_fqn(name: str) -> bool:
    try:
        return spark.catalog.tableExists(name)
    except Exception:
        return False

remaining_physical = []
for row in objects:
    set_id = row["backup_set_id"]
    status_rows = spark.table(BACKUP_SETS).where(F.col("backup_set_id") == set_id).select("retention_status").collect()
    if len(status_rows) == 1 and status_rows[0]["retention_status"] == "DELETED":
        if exists_fqn(row["backup_object"]):
            remaining_physical.append(row["backup_object"])

if remaining_physical:
    failures.append({
        "backup_set_id": None,
        "backup_object": None,
        "error": "Objects still exist after DELETED status: " + ", ".join(remaining_physical),
    })

# Retained validated recovery points must remain present in the registry.
retained_registry_count = (
    spark.table(BACKUP_SETS)
    .where(F.col("backup_set_id").isin(retained_ids))
    .where(F.col("validation_status") == "VALIDATED")
    .count()
)
if retained_registry_count != len(retained_ids):
    failures.append({
        "backup_set_id": None,
        "backup_object": None,
        "error": f"Retained registry validation mismatch: expected={len(retained_ids)}, actual={retained_registry_count}",
    })

# COMMAND ----------
result = {
    **summary,
    "status": "FAILED" if failures else "SUCCEEDED",
    "deleted_backup_set_count": deleted_sets,
    "deleted_backup_object_count": deleted_objects,
    "failure_count": len(failures),
    "failures": failures,
}

print(json.dumps(result, indent=2, default=str))

dbutils.jobs.taskValues.set(key="retention_status", value=result["status"])
dbutils.jobs.taskValues.set(key="deleted_backup_set_count", value=deleted_sets)
dbutils.jobs.taskValues.set(key="deleted_backup_object_count", value=deleted_objects)
dbutils.jobs.taskValues.set(key="retained_backup_set_ids", value=retained_ids)

if failures:
    if CURRENT_BACKUP_SET_ID:
        log_event(CURRENT_BACKUP_SET_ID, "FAILED", f"Retention completed with {len(failures)} failure(s)")
    raise RuntimeError("Retention failed: " + json.dumps(failures, default=str))

if CURRENT_BACKUP_SET_ID:
    log_event(
        CURRENT_BACKUP_SET_ID,
        "SUCCEEDED",
        f"Retention completed: deleted_sets={deleted_sets}, deleted_objects={deleted_objects}, retained={retained_ids}",
    )

dbutils.notebook.exit(json.dumps(result, default=str))
