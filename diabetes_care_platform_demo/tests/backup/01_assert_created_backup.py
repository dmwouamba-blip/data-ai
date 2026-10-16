# Databricks notebook source
# MAGIC %md
# MAGIC # Assert Created Backup
# MAGIC
# MAGIC Integration assertion executed after `create_validate_backup.py`.
# MAGIC It validates the persisted backup set, object inventory, row-count parity,
# MAGIC destination availability, registry uniqueness, and monitoring view output.

# COMMAND ----------
from pyspark.sql import functions as F

BACKUP_CATALOG = "dcp_synth_backup"
ADMIN_SCHEMA = "admin"

BACKUP_SETS = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}.backup_sets"
BACKUP_OBJECTS = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}.backup_objects"
BACKUP_CONFIG = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}.backup_object_config"
BACKUP_SUMMARY = f"{BACKUP_CATALOG}.{ADMIN_SCHEMA}.v_backup_summary"

# COMMAND ----------
# The Bundle task must pass:
# {{tasks.<create-task-key>.values.backup_set_id}}
dbutils.widgets.text("backup_set_id", "", "Backup set ID")
backup_set_id = dbutils.widgets.get("backup_set_id").strip()

if not backup_set_id:
    raise ValueError(
        "backup_set_id is required. Verify the downstream task base_parameters "
        "reference the create task value correctly."
    )

print(f"Validating backup_set_id={backup_set_id}")

# COMMAND ----------
# Foundation preflight.
required_relations = [
    BACKUP_SETS,
    BACKUP_OBJECTS,
    BACKUP_CONFIG,
    BACKUP_SUMMARY,
]

missing_relations = [
    relation
    for relation in required_relations
    if not spark.catalog.tableExists(relation)
]

if missing_relations:
    raise AssertionError(
        "Missing backup foundation relation(s): "
        + ", ".join(missing_relations)
    )

# COMMAND ----------
# Exactly one persisted backup-set row must exist for the task value.
sets = (
    spark.table(BACKUP_SETS)
    .where(F.col("backup_set_id") == backup_set_id)
)

matching_set_count = sets.count()

if matching_set_count != 1:
    latest_sets = (
        spark.table(BACKUP_SETS)
        .select(
            "backup_set_id",
            "environment",
            "validation_status",
            "refresh_status",
            "retention_status",
            "started_at",
            "completed_at",
            "error_message",
        )
        .orderBy(F.col("started_at").desc_nulls_last())
        .limit(10)
    )

    display(latest_sets)

    raise AssertionError(
        f"Expected exactly one backup set row for {backup_set_id}, "
        f"but found {matching_set_count}. Verify create_validate_backup.py "
        "persisted the row before publishing the task value and that the "
        "Bundle task reference uses the correct upstream task key."
    )

backup_set = sets.first()

assert backup_set["validation_status"] == "VALIDATED", backup_set
assert backup_set["refresh_status"] == "READY_FOR_REFRESH", backup_set
assert backup_set["retention_status"] in ("ACTIVE", "RETAINED"), backup_set
assert backup_set["completed_at"] is not None, backup_set
assert backup_set["created_at"] is not None, backup_set
assert backup_set["updated_at"] is not None, backup_set
assert backup_set["error_message"] is None, backup_set

# COMMAND ----------
# Enabled configuration and persisted object records must match exactly.
configured = (
    spark.table(BACKUP_CONFIG)
    .where(F.col("enabled") == True)
    .select("source_object")
    .distinct()
)

objects = (
    spark.table(BACKUP_OBJECTS)
    .where(F.col("backup_set_id") == backup_set_id)
)

configured_count = configured.count()
object_count = objects.count()

if configured_count <= 0:
    raise AssertionError("No enabled backup objects are configured")

if configured_count != object_count:
    configured_sources = {
        row["source_object"] for row in configured.collect()
    }
    object_sources = {
        row["source_object"]
        for row in objects.select("source_object").collect()
    }

    missing_object_rows = sorted(configured_sources - object_sources)
    unexpected_object_rows = sorted(object_sources - configured_sources)

    raise AssertionError(
        "Configured/object mismatch: "
        f"configured={configured_count}, persisted={object_count}, "
        f"missing={missing_object_rows}, unexpected={unexpected_object_rows}"
    )

# COMMAND ----------
# Every object must be validated. Use error_details for object-level failures.
failed_objects = objects.where(
    F.col("validation_status") != "VALIDATED"
)
failed_count = failed_objects.count()

if failed_count:
    display(
        failed_objects.select(
            "source_object",
            "backup_object",
            "backup_method",
            "validation_status",
            "error_details",
        )
    )
    raise AssertionError(
        f"Backup contains {failed_count} failed object(s)"
    )

# COMMAND ----------
# Source and backup row counts must be present and equal.
count_mismatches = objects.where(
    F.col("source_row_count").isNull()
    | F.col("backup_row_count").isNull()
    | (F.col("source_row_count") != F.col("backup_row_count"))
)
count_mismatch_count = count_mismatches.count()

if count_mismatch_count:
    display(
        count_mismatches.select(
            "source_object",
            "backup_object",
            "source_row_count",
            "backup_row_count",
            "error_details",
        )
    )
    raise AssertionError(
        f"Backup contains {count_mismatch_count} row-count mismatch(es)"
    )

# COMMAND ----------
# Schema evidence must be captured. If backup_schema_json is populated, it must
# equal source_schema_json. This supports both old and new notebook versions.
schema_missing = objects.where(
    F.col("source_schema_json").isNull()
).count()

if schema_missing:
    raise AssertionError(
        f"Backup contains {schema_missing} object(s) without source schema evidence"
    )

objects_columns = set(objects.columns)
if "backup_schema_json" in objects_columns:
    schema_mismatches = objects.where(
        F.col("backup_schema_json").isNull()
        | (F.col("source_schema_json") != F.col("backup_schema_json"))
    )
    schema_mismatch_count = schema_mismatches.count()

    if schema_mismatch_count:
        display(
            schema_mismatches.select(
                "source_object",
                "backup_object",
                "source_schema_json",
                "backup_schema_json",
                "error_details",
            )
        )
        raise AssertionError(
            f"Backup contains {schema_mismatch_count} schema mismatch(es)"
        )

# COMMAND ----------
# Every physical destination must exist and remain queryable.
for row in objects.select(
    "source_object",
    "backup_object",
    "backup_method",
).collect():
    source = row["source_object"]
    destination = row["backup_object"]

    if not destination or destination == "NOT_CREATED":
        raise AssertionError(
            f"Backup object was not created for source {source}: {destination!r}"
        )

    if not spark.catalog.tableExists(destination):
        raise AssertionError(
            f"Backup object unavailable for source {source}: {destination}"
        )

    # Executes a minimal physical-read check.
    spark.table(destination).limit(1).collect()

# COMMAND ----------
# No source object may have more than one registry row in the same backup set.
duplicates = (
    objects
    .groupBy("source_object")
    .count()
    .where(F.col("count") > 1)
    .collect()
)

if duplicates:
    raise AssertionError(
        "Duplicate object records: "
        + ", ".join(
            f"{row['source_object']} ({row['count']})"
            for row in duplicates
        )
    )

# No backup destination may be registered more than once in the set.
duplicate_destinations = (
    objects
    .groupBy("backup_object")
    .count()
    .where(F.col("count") > 1)
    .collect()
)

if duplicate_destinations:
    raise AssertionError(
        "Duplicate backup destinations: "
        + ", ".join(
            f"{row['backup_object']} ({row['count']})"
            for row in duplicate_destinations
        )
    )

# COMMAND ----------
# The summary view must expose exactly one row and consistent counts.
summary = (
    spark.table(BACKUP_SUMMARY)
    .where(F.col("backup_set_id") == backup_set_id)
)

summary_count = summary.count()
if summary_count != 1:
    raise AssertionError(
        f"v_backup_summary returned {summary_count} rows for {backup_set_id}; expected 1"
    )

summary_row = summary.first()

assert summary_row["object_count"] == object_count, summary_row
assert summary_row["validated_objects"] == object_count, summary_row
assert summary_row["failed_objects"] == 0, summary_row
assert summary_row["validation_status"] == "VALIDATED", summary_row
assert summary_row["refresh_status"] == "READY_FOR_REFRESH", summary_row

# COMMAND ----------
# Publish test evidence for optional downstream test tasks.
dbutils.jobs.taskValues.set(
    key="asserted_backup_set_id",
    value=backup_set_id,
)

dbutils.jobs.taskValues.set(
    key="asserted_backup_object_count",
    value=object_count,
)

dbutils.jobs.taskValues.set(
    key="backup_assertion_status",
    value="PASS",
)

# COMMAND ----------
display(summary)

print(
    f"PASS: validated backup set {backup_set_id} "
    f"with {object_count} object(s)"
)
