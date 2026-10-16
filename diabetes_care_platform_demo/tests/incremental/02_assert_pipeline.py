# Databricks notebook source
checks=[("dcp_synth.01_bronze_incremental.cgm_readings_incremental","reading_id"),("dcp_synth.02_silver_incremental.glucose_readings_incremental","reading_id"),("dcp_synth.03_gold_incremental.dp02_patient_glucose_summary_incremental","patient_id")]
for t,k in checks:
 d=spark.table(t)
 if d.count()==0: raise AssertionError(f"Empty {t}")
 if d.where(f"{k} IS NULL").count(): raise AssertionError(f"Null keys {t}")
if spark.table(checks[1][0]).groupBy("reading_id").count().where("count>1").count(): raise AssertionError("Duplicate reading_id")
print("PASS incremental pipeline")
