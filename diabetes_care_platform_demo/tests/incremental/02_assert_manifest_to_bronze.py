# Databricks notebook source
"""Reconcile generated manifest counts with Bronze rows for the same run."""

# COMMAND ----------
from pyspark.sql import functions as F

CATALOG = "dcp_synth"
dbutils.widgets.text("run_id", "", "Run ID")
run_id = dbutils.widgets.get("run_id").strip()
if not run_id:
    raise ValueError("run_id is required")

mapping = {
    ("SRC-11", "patient_master"): f"{CATALOG}.01_bronze_incremental.patient_master_incremental",
    ("SRC-01", "cgm_readings"): f"{CATALOG}.01_bronze_incremental.cgm_readings_incremental",
    ("SRC-06", "mysugr_logbook"): f"{CATALOG}.01_bronze_incremental.mysugr_logbook_incremental",
    ("SRC-16", "device_events"): f"{CATALOG}.01_bronze_incremental.device_events_incremental",
    ("SRC-14", "consent_events"): f"{CATALOG}.01_bronze_incremental.consent_events_incremental",
    ("SRC-15", "consent_propagation"): f"{CATALOG}.01_bronze_incremental.consent_propagation_incremental",
    ("SRC-17", "patient_alerts"): f"{CATALOG}.01_bronze_incremental.patient_alerts_incremental",
    ("SRC-07", "report_sharing"): f"{CATALOG}.01_bronze_incremental.report_sharing_incremental",
}

manifest = spark.table(f"{CATALOG}.00_config.generator_manifest").where(
    F.col("run_id") == run_id
)
failures = []
for row in manifest.collect():
    key = (row["source_id"], row["dataset_name"])
    relation = mapping.get(key)
    if not relation:
        failures.append(f"No Bronze mapping for {key}")
        continue
    if not spark.catalog.tableExists(relation):
        failures.append(f"Missing Bronze relation {relation}")
        continue
    actual = spark.table(relation).where(F.col("_run_id") == run_id).count()
    expected = int(row["record_count"])
    if actual != expected:
        failures.append(f"{relation}: expected {expected}, actual {actual}")

if failures:
    raise AssertionError("Manifest/Bronze reconciliation failed:\n- " + "\n- ".join(failures))

print(f"PASS manifest-to-Bronze reconciliation; run_id={run_id}")
