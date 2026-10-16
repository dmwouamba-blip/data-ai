# Databricks notebook source
"""Preflight checks and baseline capture for the incremental test suite."""

# COMMAND ----------
from datetime import datetime, timezone
from pyspark.sql import functions as F

CATALOG = "dcp_synth"
TEST_STARTED_AT = datetime.now(timezone.utc).replace(microsecond=0)

required = [
    f"{CATALOG}.00_config.generator_state",
    f"{CATALOG}.00_config.generator_runs",
    f"{CATALOG}.00_config.generator_manifest",
]
missing = [name for name in required if not spark.catalog.tableExists(name)]
if missing:
    raise AssertionError("Missing incremental foundation objects: " + ", ".join(missing))

# Fail if another generator run is currently active.
running = spark.table(f"{CATALOG}.00_config.generator_runs").where(
    F.col("status") == "RUNNING"
).count()
if running:
    raise AssertionError(f"Found {running} RUNNING generator run(s)")

# Foundation key integrity.
duplicate_state = (
    spark.table(f"{CATALOG}.00_config.generator_state")
    .groupBy("source_id")
    .count()
    .where("count > 1")
    .count()
)
if duplicate_state:
    raise AssertionError(f"generator_state contains {duplicate_state} duplicate source key(s)")

# Capture baseline counts only for relations that already exist.
relations = [
    f"{CATALOG}.01_bronze_incremental.patient_master_incremental",
    f"{CATALOG}.01_bronze_incremental.cgm_readings_incremental",
    f"{CATALOG}.01_bronze_incremental.mysugr_logbook_incremental",
    f"{CATALOG}.01_bronze_incremental.device_events_incremental",
    f"{CATALOG}.01_bronze_incremental.consent_events_incremental",
    f"{CATALOG}.01_bronze_incremental.consent_propagation_incremental",
    f"{CATALOG}.01_bronze_incremental.patient_alerts_incremental",
    f"{CATALOG}.01_bronze_incremental.report_sharing_incremental",
]

baseline = {}
for relation in relations:
    baseline[relation] = spark.table(relation).count() if spark.catalog.tableExists(relation) else 0

# Task values are intentionally scalar/JSON-compatible.
dbutils.jobs.taskValues.set(key="test_started_at", value=TEST_STARTED_AT.isoformat())
dbutils.jobs.taskValues.set(key="baseline_counts", value=baseline)

print(f"PASS preflight; test_started_at={TEST_STARTED_AT.isoformat()}")
print(baseline)
