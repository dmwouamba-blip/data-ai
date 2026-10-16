# Databricks notebook source
"""Non-destructive retention and registry integrity assertions."""

from pyspark.sql import functions as F

BACKUP_CATALOG = "dcp_synth_backup"

dbutils.widgets.text("environment", "dev", "Environment")
environment = dbutils.widgets.get("environment").strip()

sets = spark.table(f"{BACKUP_CATALOG}.admin.backup_sets")
objects = spark.table(f"{BACKUP_CATALOG}.admin.backup_objects")
active = sets.where(
    (F.col("environment") == environment)
    & (F.col("validation_status") == "VALIDATED")
    & (F.coalesce(F.col("retention_status"), F.lit("ACTIVE")) != "DELETED")
)

active_count = active.count()
if active_count > 2:
    candidates = spark.table(
        f"{BACKUP_CATALOG}.admin.v_retention_candidates"
    ).where(F.col("environment") == environment)
    display(candidates)
    raise AssertionError(
        f"Retention policy violated: {active_count} active validated sets for {environment}"
    )

# No VALIDATED set may contain a non-validated child object.
invalid_children = (
    active.select("backup_set_id")
    .join(objects, "backup_set_id")
    .where("validation_status <> 'VALIDATED'")
    .count()
)
if invalid_children:
    raise AssertionError(
        f"Validated sets contain {invalid_children} invalid child object(s)"
    )

# No object may reference a missing parent set.
orphans = objects.join(
    sets.select("backup_set_id"), "backup_set_id", "left_anti"
).count()
if orphans:
    raise AssertionError(f"Found {orphans} orphan backup object record(s)")

# Registry identifiers should be unique.
duplicate_sets = sets.groupBy("backup_set_id").count().where("count > 1").count()
if duplicate_sets:
    raise AssertionError(f"Found {duplicate_sets} duplicate backup_set_id value(s)")

print(
    f"PASS: retention and registry integrity; environment={environment}; "
    f"active_validated_sets={active_count}"
)
