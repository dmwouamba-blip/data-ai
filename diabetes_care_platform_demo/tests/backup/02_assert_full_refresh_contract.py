# Databricks notebook source
"""Independent assertions for the post-full-refresh validation contract."""

checks = [
    ("dcp_synth.01_bronze.patient_master", "patient_id"),
    ("dcp_synth.01_bronze.cgm_readings", "reading_id"),
    ("dcp_synth.02_silver.glucose_readings", "reading_id"),
    ("dcp_synth.03_gold.dp02_patient_glucose_summary", "patient_id"),
]

failures = []
for table_name, key_column in checks:
    try:
        df = spark.table(table_name)
        rows = df.count()
        null_keys = df.where(f"`{key_column}` IS NULL").count()
        if rows <= 0:
            failures.append(f"{table_name}: empty")
        if null_keys > 0:
            failures.append(f"{table_name}: {null_keys} null {key_column} value(s)")
    except Exception as exc:
        failures.append(f"{table_name}: {type(exc).__name__}: {exc}")

if failures:
    raise AssertionError("Full-refresh contract failed:\n- " + "\n- ".join(failures))

print("PASS: post-full-refresh Bronze/Silver/Gold contract")
