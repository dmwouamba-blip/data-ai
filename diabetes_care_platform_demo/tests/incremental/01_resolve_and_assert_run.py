# Databricks notebook source
"""Resolve the run produced by the child deployment and validate its manifest."""

# COMMAND ----------
from datetime import datetime
from pyspark.sql import functions as F

CATALOG = "dcp_synth"
dbutils.widgets.text("test_started_at", "", "Test start timestamp")
test_started_at = dbutils.widgets.get("test_started_at").strip()
if not test_started_at:
    raise ValueError("test_started_at is required")

start = datetime.fromisoformat(test_started_at)
runs = (
    spark.table(f"{CATALOG}.00_config.generator_runs")
    .where(F.col("started_at") >= F.lit(start))
    .orderBy(F.col("started_at").desc())
)

successful = runs.where(F.col("status") == "SUCCEEDED")
if successful.count() != 1:
    display(runs)
    raise AssertionError(
        f"Expected exactly one SUCCEEDED run after {test_started_at}; "
        f"found {successful.count()}"
    )

run = successful.first()
run_id = run["run_id"]
if run["completed_at"] is None:
    raise AssertionError(f"Run {run_id} has no completed_at")

manifest = spark.table(f"{CATALOG}.00_config.generator_manifest").where(
    F.col("run_id") == run_id
)
expected_datasets = {
    ("SRC-01", "cgm_readings"),
    ("SRC-06", "mysugr_logbook"),
    ("SRC-07", "report_sharing"),
    ("SRC-11", "patient_master"),
    ("SRC-14", "consent_events"),
    ("SRC-15", "consent_propagation"),
    ("SRC-16", "device_events"),
    ("SRC-17", "patient_alerts"),
}
actual = {(r["source_id"], r["dataset_name"]) for r in manifest.collect()}
if actual != expected_datasets:
    raise AssertionError(
        f"Manifest dataset mismatch. Missing={sorted(expected_datasets-actual)}, "
        f"unexpected={sorted(actual-expected_datasets)}"
    )

if manifest.where("record_count <= 0").count():
    raise AssertionError("Manifest contains empty generated dataset(s)")
if manifest.where("output_path IS NULL OR schema_version IS NULL").count():
    raise AssertionError("Manifest contains missing path/schema version")

# Ensure every manifest output path contains files.
for row in manifest.select("output_path").collect():
    files = dbutils.fs.ls(row["output_path"])
    if not files:
        raise AssertionError(f"No files found at {row['output_path']}")

# Validate one state row per implemented source and the propagated run ID.
state = spark.table(f"{CATALOG}.00_config.generator_state")
for source_id, _ in expected_datasets:
    rows = state.where(F.col("source_id") == source_id)
    if rows.count() != 1:
        raise AssertionError(f"Expected one state row for {source_id}")
    if rows.first()["last_successful_run_id"] != run_id:
        raise AssertionError(f"State for {source_id} does not point to {run_id}")

dbutils.jobs.taskValues.set(key="run_id", value=run_id)
print(f"PASS run and manifest validation; run_id={run_id}")
display(manifest.orderBy("source_id"))
