# Databricks notebook source
from pyspark import pipelines as dp
CATALOG=spark.conf.get("pipelines.catalog_name","dcp_synth")

@dp.materialized_view(name="dp01_patient_glucose_timeline", comment="DP-01 synthetic patient glucose timeline")
def dp01_patient_glucose_timeline():
 return spark.read.table(f"{CATALOG}.02_silver.glucose_readings")

@dp.materialized_view(name="dp02_patient_glucose_summary", comment="DP-02 daily synthetic glucose summary")
def dp02_patient_glucose_summary():
 return spark.sql(f"""SELECT patient_id,CAST(event_time AS DATE) measure_date,ROUND(AVG(glucose_mmol_l),2) mean_glucose_mmol_l,ROUND(percentile_approx(glucose_mmol_l,0.5),2) median_glucose_mmol_l,ROUND(100.0*COUNT_IF(glucose_mmol_l BETWEEN 3.9 AND 10.0)/NULLIF(COUNT(*),0),2) tir_pct,ROUND(100.0*COUNT_IF(glucose_mmol_l<3.9)/NULLIF(COUNT(*),0),2) tbr_pct,ROUND(100.0*COUNT_IF(glucose_mmol_l>10.0)/NULLIF(COUNT(*),0),2) tar_pct,COUNT(*) reading_count,MAX(ingested_at) refreshed_at FROM {CATALOG}.02_silver.glucose_readings GROUP BY patient_id,CAST(event_time AS DATE)""")

@dp.materialized_view(name="dp09_patient_device_status", comment="DP-09 latest synthetic device status")
def dp09_patient_device_status():
 return spark.read.table(f"{CATALOG}.02_silver.device_status")

@dp.materialized_view(name="dp10_patient_consent_current", comment="DP-10 current consent state")
def dp10_patient_consent_current():
 return spark.sql(f"""SELECT patient_id,consent_scope,purpose,recipient,new_state current_state,event_time effective_at,consent_event_id,source_id,ingested_at,_run_id FROM (SELECT *,row_number() OVER(PARTITION BY patient_id,consent_scope ORDER BY event_time DESC,ingested_at DESC,consent_event_id DESC) rn FROM {CATALOG}.02_silver.consent_events) WHERE rn=1""")

@dp.materialized_view(name="dp11_consent_propagation_status", comment="DP-11 consent propagation status")
def dp11_consent_propagation_status():
 return spark.read.table(f"{CATALOG}.01_bronze.consent_propagation")
