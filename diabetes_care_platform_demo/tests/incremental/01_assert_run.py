# Databricks notebook source
from pyspark.sql import functions as F
dbutils.widgets.text("run_id","")
rid=dbutils.widgets.get("run_id")
run=spark.table("dcp_synth.00_config.generator_runs").where(F.col("run_id")==rid)
if run.count()!=1 or run.first()["status"]!="SUCCEEDED": raise AssertionError(f"Run failed: {rid}")
m=spark.table("dcp_synth.00_config.generator_manifest").where(F.col("run_id")==rid)
if m.count()!=8: raise AssertionError(f"Expected 8 manifest rows, got {m.count()}")
if m.where("record_count<=0").count(): raise AssertionError("Empty generated dataset")
print(f"PASS run {rid}")
