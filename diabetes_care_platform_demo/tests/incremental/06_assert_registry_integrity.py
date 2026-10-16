# Databricks notebook source
"""Validate generator registry integrity."""

# COMMAND ----------
from pyspark.sql import functions as F

runs = spark.table("dcp_synth.00_config.generator_runs")
state = spark.table("dcp_synth.00_config.generator_state")
manifest = spark.table("dcp_synth.00_config.generator_manifest")
failures=[]
if runs.groupBy("run_id").count().where("count > 1").count(): failures.append("Duplicate run_id")
if state.groupBy("source_id").count().where("count > 1").count(): failures.append("Duplicate state source_id")
if manifest.groupBy("run_id","source_id","dataset_name").count().where("count > 1").count(): failures.append("Duplicate manifest dataset record")
if manifest.join(runs.select("run_id"),"run_id","left_anti").count(): failures.append("Orphan manifest run_id")
if state.where("last_sequence < 0 OR updated_at IS NULL").count(): failures.append("Invalid generator state")
if failures: raise AssertionError("Registry integrity failed: "+", ".join(failures))
print("PASS incremental registry integrity")
