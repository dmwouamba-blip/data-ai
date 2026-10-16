# Databricks notebook source
"""Non-destructive preflight validation for the DCP backup control plane."""

from pyspark.sql import functions as F

BACKUP_CATALOG = "dcp_synth_backup"

required_tables = [
    f"{BACKUP_CATALOG}.admin.backup_sets",
    f"{BACKUP_CATALOG}.admin.backup_objects",
    f"{BACKUP_CATALOG}.admin.backup_object_config",
    f"{BACKUP_CATALOG}.admin.backup_execution_log",
]
required_views = [
    f"{BACKUP_CATALOG}.admin.v_backup_summary",
    f"{BACKUP_CATALOG}.admin.v_backup_validation_failures",
    f"{BACKUP_CATALOG}.admin.v_latest_recovery_point",
    f"{BACKUP_CATALOG}.admin.v_recovery_inventory",
    f"{BACKUP_CATALOG}.admin.v_retention_candidates",
    f"{BACKUP_CATALOG}.admin.v_active_backup_sets",
    f"{BACKUP_CATALOG}.admin.v_backup_health",
]

failures = []
for relation in required_tables + required_views:
    if not spark.catalog.tableExists(relation):
        failures.append(f"Missing relation: {relation}")

if not failures:
    config = spark.table(f"{BACKUP_CATALOG}.admin.backup_object_config")
    enabled = config.where(F.col("enabled") == True)

    if enabled.count() == 0:
        failures.append("No enabled backup objects")

    duplicate_sources = (
        enabled.groupBy("source_object").count().where("count > 1").collect()
    )
    if duplicate_sources:
        failures.append(
            "Duplicate configured sources: "
            + ", ".join(r["source_object"] for r in duplicate_sources)
        )

    invalid_criticality = enabled.where(
        ~F.col("criticality").isin("CRITICAL", "IMPORTANT", "OPTIONAL")
    ).count()
    if invalid_criticality:
        failures.append(f"Invalid criticality rows: {invalid_criticality}")

    invalid_method = enabled.where(
        ~F.col("preferred_backup_method").isin("DEEP_CLONE", "CTAS_SNAPSHOT")
    ).count()
    if invalid_method:
        failures.append(f"Invalid backup method rows: {invalid_method}")

    for row in enabled.select("source_object").collect():
        if not spark.catalog.tableExists(row["source_object"]):
            failures.append(f"Configured source is missing: {row['source_object']}")

if failures:
    raise AssertionError("Preflight failed:\n- " + "\n- ".join(failures))

print("PASS: DCP backup foundation and configuration preflight")
