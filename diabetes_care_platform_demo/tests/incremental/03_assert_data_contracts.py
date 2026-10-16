# Databricks notebook source
"""Critical Bronze, Silver and Gold contract assertions."""

# COMMAND ----------
from pyspark.sql import functions as F

CATALOG = "dcp_synth"
checks = [
    (f"{CATALOG}.01_bronze_incremental.patient_master_incremental", ["patient_id"]),
    (f"{CATALOG}.01_bronze_incremental.cgm_readings_incremental", ["reading_id", "patient_id", "event_time"]),
    (f"{CATALOG}.02_silver_incremental.patient_incremental", ["patient_id"]),
    (f"{CATALOG}.02_silver_incremental.glucose_readings_incremental", ["reading_id", "patient_id"]),
    (f"{CATALOG}.02_silver_incremental.consent_current_incremental", ["patient_id", "consent_scope"]),
    (f"{CATALOG}.03_gold_incremental.dp02_patient_glucose_summary_incremental", ["patient_id", "measure_date"]),
]
failures = []
for relation, keys in checks:
    if not spark.catalog.tableExists(relation):
        failures.append(f"Missing relation: {relation}")
        continue
    df = spark.table(relation)
    if df.count() == 0:
        failures.append(f"Empty relation: {relation}")
    for key in keys:
        if df.where(F.col(key).isNull()).count():
            failures.append(f"Null key {key}: {relation}")

# Uniqueness at declared grains.
unique_checks = [
    (f"{CATALOG}.02_silver_incremental.patient_incremental", ["patient_id"]),
    (f"{CATALOG}.02_silver_incremental.glucose_readings_incremental", ["reading_id"]),
    (f"{CATALOG}.02_silver_incremental.consent_current_incremental", ["patient_id", "consent_scope"]),
    (f"{CATALOG}.03_gold_incremental.dp02_patient_glucose_summary_incremental", ["patient_id", "measure_date"]),
]
for relation, keys in unique_checks:
    if spark.catalog.tableExists(relation):
        duplicate_groups = spark.table(relation).groupBy(*keys).count().where("count > 1").count()
        if duplicate_groups:
            failures.append(f"{relation}: {duplicate_groups} duplicate grain group(s)")

# Known domain checks.
glucose = spark.table(f"{CATALOG}.02_silver_incremental.glucose_readings_incremental")
if glucose.where("quality_status <> 'PASS'").count():
    failures.append("Generated glucose contains non-PASS quality_status")
if glucose.where("glucose_mmol_l < 1.0 OR glucose_mmol_l > 35.0").count():
    failures.append("Glucose outside 1.0..35.0 mmol/L")

device = spark.table(f"{CATALOG}.02_silver_incremental.device_events_incremental")
if device.where("battery_pct < 0 OR battery_pct > 100").count():
    failures.append("Device battery outside 0..100")

consent = spark.table(f"{CATALOG}.02_silver_incremental.consent_current_incremental")
if consent.where("current_state NOT IN ('GRANTED','REVOKED','EXPIRED','CORRECTED')").count():
    failures.append("Invalid consent current_state")

if failures:
    raise AssertionError("Data contract tests failed:\n- " + "\n- ".join(failures))

print("PASS incremental Bronze/Silver/Gold data contracts")
