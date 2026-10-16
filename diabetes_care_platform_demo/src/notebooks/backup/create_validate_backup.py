# Databricks notebook source
# MAGIC %md
# MAGIC # Create and Validate Backup
# MAGIC
# MAGIC Creates one validated recovery point before a guarded Full Refresh.
# MAGIC The notebook publishes `backup_set_id` only after the registry row and
# MAGIC all object-level backup evidence have been persisted successfully.

# COMMAND ----------
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from pyspark.sql import functions as F

# COMMAND ----------
# Job and notebook parameters.
dbutils.widgets.text("environment", "dev", "Environment")
dbutils.widgets.text("refresh_type", "FULL_REFRESH", "Refresh type")
dbutils.widgets.text("requested_by", "", "Requested by")
dbutils.widgets.text("request_reason", "Guarded Full Refresh", "Request reason")
dbutils.widgets.text("backup_catalog", "dcp_synth_backup", "Backup catalog")
dbutils.widgets.text("admin_schema", "admin", "Backup admin schema")

environment = dbutils.widgets.get("environment").strip()
refresh_type = dbutils.widgets.get("refresh_type").strip().upper()
requested_by = dbutils.widgets.get("requested_by").strip() or None
request_reason = dbutils.widgets.get("request_reason").strip() or None
BACKUP_CATALOG = dbutils.widgets.get("backup_catalog").strip()
ADMIN_SCHEMA = dbutils.widgets.get("admin_schema").strip()

if not environment:
    raise ValueError("environment is required")
if not refresh_type:
    raise ValueError("refresh_type is required")

# COMMAND ----------
# Identifier helpers.
# Components such as 01_bronze, 02_silver, and 03_gold are valid when quoted.
def quote_identifier_part(value: str) -> str:
    if value is None:
        raise ValueError("Identifier component must not be None")

    normalized = value.strip()
    if not normalized:
        raise ValueError("Identifier component must not be empty")

    if any(character in normalized for character in ("\x00", "\n", "\r", "\t")):
        raise ValueError(
            f"Identifier contains unsupported control characters: {value!r}"
        )

    return f"`{normalized.replace('`', '``')}`"


def quote_fqn(value: str) -> str:
    if value is None:
        raise ValueError("Fully qualified object name must not be None")

    parts = [part.strip() for part in value.split(".")]
    if len(parts) != 3:
        raise ValueError(
            "Expected a three-part Unity Catalog object name in the format "
            f"catalog.schema.object, got {value!r}"
        )
    if any(not part for part in parts):
        raise ValueError(
            f"Fully qualified object name contains an empty component: {value!r}"
        )

    return ".".join(quote_identifier_part(part) for part in parts)


BACKUP_LAYER_MAP = {
    "bronze": "bronze",
    "01_bronze": "bronze",
    "silver": "silver",
    "02_silver": "silver",
    "gold": "gold",
    "03_gold": "gold",
}


def resolve_backup_schema(layer: str) -> str:
    if layer is None:
        raise ValueError("Backup layer must not be None")

    normalized = layer.strip().lower()
    if not normalized:
        raise ValueError("Backup layer must not be empty")

    backup_schema = BACKUP_LAYER_MAP.get(normalized)
    if backup_schema is None:
        raise ValueError(
            f"Unsupported backup layer: {layer!r}. Supported values: "
            f"{sorted(BACKUP_LAYER_MAP)}"
        )

    return backup_schema


def safe_backup_object_name(source_object: str, backup_set_id: str) -> str:
    source_parts = source_object.split(".")
    if len(source_parts) != 3:
        raise ValueError(f"Expected three-part source object, got {source_object!r}")

    source_leaf = source_parts[-1].strip()
    if not source_leaf:
        raise ValueError(f"Source object has no table name: {source_object!r}")

    safe_source_leaf = re.sub(r"[^A-Za-z0-9_]", "_", source_leaf)
    safe_backup_set_id = re.sub(r"[^A-Za-z0-9_]", "_", backup_set_id)
    return f"{safe_source_leaf}__{safe_backup_set_id}".lower()


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


ADMIN_FQN = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}"
BACKUP_SETS = f"{ADMIN_FQN}.backup_sets"
BACKUP_OBJECTS = f"{ADMIN_FQN}.backup_objects"
BACKUP_CONFIG = f"{ADMIN_FQN}.backup_object_config"
EXECUTION_LOG = f"{ADMIN_FQN}.backup_execution_log"

# Validate administration names by quoting them.
quote_identifier_part(BACKUP_CATALOG)
quote_identifier_part(ADMIN_SCHEMA)

# COMMAND ----------
# Foundation preflight.
required_tables = [BACKUP_SETS, BACKUP_OBJECTS, BACKUP_CONFIG, EXECUTION_LOG]
missing_tables = [
    table_name for table_name in required_tables
    if not spark.catalog.tableExists(table_name)
]
if missing_tables:
    raise RuntimeError(
        "Backup Foundation is incomplete. Missing table(s): "
        + ", ".join(missing_tables)
    )

required_columns = {
    BACKUP_SETS: {
        "backup_set_id", "environment", "refresh_type", "requested_by",
        "request_reason", "started_at", "completed_at", "validation_status",
        "refresh_status", "retention_status", "deleted_at", "error_message",
        "created_at", "updated_at",
    },
    BACKUP_OBJECTS: {
        "backup_set_id", "layer", "object_type", "backup_method",
        "source_object", "backup_object", "source_row_count",
        "backup_row_count", "source_schema_json", "backup_schema_json",
        "validation_status", "completed_at", "error_details",
        "created_at", "updated_at",
    },
    BACKUP_CONFIG: {
        "layer", "source_object", "enabled", "owner_group", "criticality",
        "preferred_backup_method", "created_at", "updated_at",
    },
    EXECUTION_LOG: {
        "execution_id", "backup_set_id", "step_name", "status",
        "message", "executed_at",
    },
}

for table_name, expected_columns in required_columns.items():
    actual_columns = set(spark.table(table_name).columns)
    missing_columns = sorted(expected_columns - actual_columns)
    if missing_columns:
        raise RuntimeError(
            f"{table_name} is missing required column(s): "
            + ", ".join(missing_columns)
        )

# COMMAND ----------
# Load and validate enabled configuration.
configured = (
    spark.table(BACKUP_CONFIG)
    .where(F.col("enabled") == True)
    .select(
        "layer",
        "source_object",
        "owner_group",
        "criticality",
        "preferred_backup_method",
    )
)

configured_count = configured.count()
if configured_count <= 0:
    raise RuntimeError("No enabled backup objects are configured")

duplicate_config = (
    configured.groupBy("source_object")
    .count()
    .where(F.col("count") > 1)
    .collect()
)
if duplicate_config:
    raise RuntimeError(
        "Duplicate enabled backup configuration: "
        + ", ".join(
            f"{row['source_object']} ({row['count']} entries)"
            for row in duplicate_config
        )
    )

configuration_rows = configured.collect()
allowed_criticality = {"CRITICAL", "IMPORTANT", "OPTIONAL"}
allowed_backup_methods = {"DEEP_CLONE", "CTAS_SNAPSHOT"}

for row in configuration_rows:
    source_object = row["source_object"]
    configured_layer = row["layer"]
    criticality = row["criticality"]
    preferred_backup_method = row["preferred_backup_method"]

    quoted_source_object = quote_fqn(source_object)
    backup_schema = resolve_backup_schema(configured_layer)
    quoted_backup_schema = quote_identifier_part(backup_schema)

    if criticality not in allowed_criticality:
        raise RuntimeError(
            f"Unsupported criticality for {source_object}: {criticality!r}. "
            f"Allowed values: {sorted(allowed_criticality)}"
        )

    if preferred_backup_method not in allowed_backup_methods:
        raise RuntimeError(
            f"Unsupported backup method for {source_object}: "
            f"{preferred_backup_method!r}. Allowed values: "
            f"{sorted(allowed_backup_methods)}"
        )

    if not spark.catalog.tableExists(source_object):
        raise RuntimeError(
            f"Configured source object does not exist: {source_object}"
        )

    print(
        "Validated backup configuration: "
        f"source={quoted_source_object}, configured_layer={configured_layer}, "
        f"backup_schema={quoted_backup_schema}, criticality={criticality}, "
        f"method={preferred_backup_method}"
    )

# COMMAND ----------
# Generate immutable backup-set identifier.
backup_set_id = (
    datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    + "_"
    + uuid.uuid4().hex[:8]
)

print(json.dumps({
    "backup_set_id": backup_set_id,
    "environment": environment,
    "refresh_type": refresh_type,
    "configured_object_count": configured_count,
}, indent=2))

# COMMAND ----------
def audit(step_name: str, status: str, message: str) -> None:
    row = [(
        str(uuid.uuid4()), backup_set_id, step_name, status,
        message[:4000], utc_now_naive(),
    )]
    schema = """
        execution_id string,
        backup_set_id string,
        step_name string,
        status string,
        message string,
        executed_at timestamp
    """
    (
        spark.createDataFrame(row, schema)
        .write.mode("append")
        .saveAsTable(EXECUTION_LOG)
    )


def update_backup_set(
    validation_status: str,
    refresh_status: str,
    error_message: Optional[str],
    completed: bool,
) -> None:
    update_row = [(
        backup_set_id, validation_status, refresh_status,
        error_message, completed,
    )]
    schema = """
        backup_set_id string,
        validation_status string,
        refresh_status string,
        error_message string,
        completed boolean
    """
    spark.createDataFrame(update_row, schema).createOrReplaceTempView(
        "backup_set_status_update"
    )
    spark.sql(f"""
        MERGE INTO {quote_fqn(BACKUP_SETS)} AS t
        USING backup_set_status_update AS s
        ON t.backup_set_id = s.backup_set_id
        WHEN MATCHED THEN UPDATE SET
          t.validation_status = s.validation_status,
          t.refresh_status = s.refresh_status,
          t.error_message = s.error_message,
          t.completed_at = CASE
            WHEN s.completed THEN current_timestamp()
            ELSE t.completed_at
          END,
          t.updated_at = current_timestamp()
    """)

# COMMAND ----------
# Persist backup-set registry row before object work.
started_at = utc_now_naive()
backup_set_row = [(
    backup_set_id, environment, refresh_type, requested_by, request_reason,
    started_at, None, "PENDING", "PENDING", "ACTIVE", None, None,
    started_at, started_at,
)]
backup_set_schema = """
    backup_set_id string,
    environment string,
    refresh_type string,
    requested_by string,
    request_reason string,
    started_at timestamp,
    completed_at timestamp,
    validation_status string,
    refresh_status string,
    retention_status string,
    deleted_at timestamp,
    error_message string,
    created_at timestamp,
    updated_at timestamp
"""
(
    spark.createDataFrame(backup_set_row, backup_set_schema)
    .write.mode("append")
    .saveAsTable(BACKUP_SETS)
)

persisted_initial_count = (
    spark.table(BACKUP_SETS)
    .where(F.col("backup_set_id") == backup_set_id)
    .count()
)
if persisted_initial_count != 1:
    raise RuntimeError(
        f"Initial backup-set registry persistence failed: "
        f"backup_set_id={backup_set_id}, matching_rows={persisted_initial_count}"
    )

audit("create_backup_set", "STARTED", "Backup-set registry row persisted")

# COMMAND ----------
# Create and validate every configured recovery copy.
validated_objects = 0
failed_objects = 0

for config in configuration_rows:
    source_layer = config["layer"]
    source_object = config["source_object"]
    preferred_method = config["preferred_backup_method"]

    backup_schema = resolve_backup_schema(source_layer)
    backup_leaf = safe_backup_object_name(source_object, backup_set_id)
    backup_object = f"{BACKUP_CATALOG}.{backup_schema}.{backup_leaf}"

    source_count = None
    backup_count = None
    source_schema_json = None
    backup_schema_json = None
    object_type = "UNKNOWN"
    validation_status = "FAILED"
    error_details = None

    try:
        source_df = spark.table(source_object)
        source_count = source_df.count()
        source_schema_json = source_df.schema.json()

        try:
            object_type = spark.catalog.getTable(source_object).tableType or "UNKNOWN"
        except Exception:
            object_type = "UNKNOWN"

        quoted_source = quote_fqn(source_object)
        quoted_backup = quote_fqn(backup_object)

        print(
            "Creating backup: "
            f"source={quoted_source}, target={quoted_backup}, "
            f"configured_layer={source_layer}, backup_schema={backup_schema}, "
            f"method={preferred_method}"
        )

        if preferred_method == "DEEP_CLONE":
            spark.sql(
                f"CREATE TABLE {quoted_backup} DEEP CLONE {quoted_source}"
            )
        else:
            spark.sql(
                f"CREATE TABLE {quoted_backup} USING DELTA AS "
                f"SELECT * FROM {quoted_source}"
            )

        backup_df = spark.table(backup_object)
        backup_count = backup_df.count()
        backup_schema_json = backup_df.schema.json()

        if source_count != backup_count:
            raise RuntimeError(
                f"Row-count mismatch: source={source_count}, backup={backup_count}"
            )

        if source_schema_json != backup_schema_json:
            raise RuntimeError("Schema mismatch between source and backup")

        validation_status = "VALIDATED"
        validated_objects += 1

    except Exception as exc:
        failed_objects += 1
        error_details = f"{type(exc).__name__}: {str(exc)}"[:4000]

    completed_at = utc_now_naive()
    object_row = [(
        backup_set_id, source_layer, object_type, preferred_method,
        source_object, backup_object, source_count, backup_count,
        source_schema_json, backup_schema_json, validation_status,
        completed_at, error_details, completed_at, completed_at,
    )]
    object_schema = """
        backup_set_id string,
        layer string,
        object_type string,
        backup_method string,
        source_object string,
        backup_object string,
        source_row_count long,
        backup_row_count long,
        source_schema_json string,
        backup_schema_json string,
        validation_status string,
        completed_at timestamp,
        error_details string,
        created_at timestamp,
        updated_at timestamp
    """
    (
        spark.createDataFrame(object_row, object_schema)
        .write.mode("append")
        .saveAsTable(BACKUP_OBJECTS)
    )

    audit(
        "create_backup_object",
        "SUCCEEDED" if validation_status == "VALIDATED" else "FAILED",
        (
            f"source={source_object}; backup={backup_object}; "
            f"method={preferred_method}; status={validation_status}; "
            f"source_count={source_count}; backup_count={backup_count}; "
            f"error={error_details}"
        ),
    )

# COMMAND ----------
# Finalize fail-closed.
if failed_objects > 0:
    message = (
        f"Backup set failed: {failed_objects} failed, "
        f"{validated_objects} validated, {configured_count} configured"
    )
    update_backup_set("FAILED", "FAILED", message, True)
    audit("finalize_backup_set", "FAILED", message)
    raise RuntimeError(f"{message}; backup_set_id={backup_set_id}")

if validated_objects != configured_count:
    message = (
        f"Backup-set completeness failure: validated={validated_objects}, "
        f"configured={configured_count}"
    )
    update_backup_set("FAILED", "FAILED", message, True)
    audit("finalize_backup_set", "FAILED", message)
    raise RuntimeError(f"{message}; backup_set_id={backup_set_id}")

update_backup_set("VALIDATED", "READY_FOR_REFRESH", None, True)

# COMMAND ----------
# Verify exact registry state before publishing task values.
persisted_sets = (
    spark.table(BACKUP_SETS)
    .where(F.col("backup_set_id") == backup_set_id)
)
persisted_set_count = persisted_sets.count()
if persisted_set_count != 1:
    raise RuntimeError(
        f"Final backup-set persistence failed: backup_set_id={backup_set_id}, "
        f"matching_rows={persisted_set_count}"
    )

persisted_set = persisted_sets.first()
if persisted_set["validation_status"] != "VALIDATED":
    raise RuntimeError(f"Persisted backup set is not VALIDATED: {persisted_set}")
if persisted_set["refresh_status"] != "READY_FOR_REFRESH":
    raise RuntimeError(
        f"Persisted backup set is not READY_FOR_REFRESH: {persisted_set}"
    )
if persisted_set["completed_at"] is None:
    raise RuntimeError(f"Persisted backup set has no completed_at: {persisted_set}")

persisted_object_count = (
    spark.table(BACKUP_OBJECTS)
    .where(F.col("backup_set_id") == backup_set_id)
    .count()
)
if persisted_object_count != configured_count:
    raise RuntimeError(
        f"Final object registry persistence mismatch: configured={configured_count}, "
        f"persisted={persisted_object_count}"
    )

message = f"Backup set validated: {validated_objects}/{configured_count} objects"
audit("finalize_backup_set", "SUCCEEDED", message)

# Publish only after successful registry verification.
dbutils.jobs.taskValues.set(key="backup_set_id", value=backup_set_id)
dbutils.jobs.taskValues.set(
    key="validated_object_count", value=validated_objects
)
dbutils.jobs.taskValues.set(
    key="configured_object_count", value=configured_count
)
dbutils.jobs.taskValues.set(key="backup_status", value="VALIDATED")

# COMMAND ----------
summary = {
    "backup_set_id": backup_set_id,
    "environment": environment,
    "status": "VALIDATED",
    "refresh_status": "READY_FOR_REFRESH",
    "validated_objects": validated_objects,
    "configured_objects": configured_count,
}

print(json.dumps(summary, indent=2))
dbutils.notebook.exit(json.dumps(summary))
