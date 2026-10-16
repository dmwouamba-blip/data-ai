# Databricks notebook source
"""Assert pipeline-only rerun changed no business row counts."""

# COMMAND ----------
import json

dbutils.widgets.text("baseline_counts", "", "Baseline count JSON")
raw = dbutils.widgets.get("baseline_counts")
if not raw:
    raise ValueError("baseline_counts is required")
baseline = json.loads(raw) if isinstance(raw, str) else raw
failures = []
for relation, before in baseline.items():
    after = spark.table(relation).count()
    if int(before) != int(after):
        failures.append(f"{relation}: before={before}, after={after}")
if failures:
    raise AssertionError("No-data idempotency failed:\n- " + "\n- ".join(failures))
print("PASS pipeline-only no-data rerun idempotency")
