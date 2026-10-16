# Databricks notebook source
from pyspark import pipelines as dp
from pyspark.sql import functions as F
S="dcp_synth.02_silver_incremental"
@dp.materialized_view(name="dp01_patient_glucose_timeline_incremental")
def dp01(): return spark.read.table(f"{S}.glucose_readings_incremental").where("quality_status='PASS'")
@dp.materialized_view(name="dp02_patient_glucose_summary_incremental")
def dp02():
 d=spark.read.table(f"{S}.glucose_readings_incremental").where("quality_status='PASS'")
 return d.groupBy("patient_id",F.to_date("event_time").alias("measure_date")).agg(F.round(F.avg("glucose_mmol_l"),2).alias("mean_glucose_mmol_l"),F.count("*").alias("reading_count"),F.max("ingested_at").alias("refreshed_at"))
@dp.materialized_view(name="dp09_patient_device_status_incremental")
def dp09():
 return spark.read.table(f"{S}.device_events_incremental")
@dp.materialized_view(name="dp10_patient_consent_current_incremental")
def dp10(): return spark.read.table(f"{S}.consent_current_incremental")
@dp.materialized_view(name="dp11_consent_propagation_status_incremental")
def dp11(): return spark.read.table(f"{S}.consent_propagation_incremental")
