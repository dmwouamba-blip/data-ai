# Databricks notebook source
from pyspark import pipelines as dp
CATALOG=spark.conf.get("pipelines.catalog_name","dcp_synth")

@dp.materialized_view(name="vw_patient_glucose_summary", comment="Approved synthetic dashboard dataset")
def vw_patient_glucose_summary():
 return spark.table(f"{CATALOG}.03_gold.dp02_patient_glucose_summary").select("patient_id","measure_date","mean_glucose_mmol_l","tir_pct","tbr_pct","tar_pct","reading_count","refreshed_at")

@dp.materialized_view(name="vw_patient_consent_current", comment="Approved synthetic consent dashboard dataset")
def vw_patient_consent_current():
 return spark.table(f"{CATALOG}.03_gold.dp10_patient_consent_current").select("patient_id","consent_scope","purpose","recipient","current_state","effective_at")

@dp.materialized_view(name="vw_consent_propagation_summary", comment="Synthetic propagation summary")
def vw_consent_propagation_summary():
 return spark.sql(f"""SELECT target_system,target_status,COUNT(*) propagation_count,MAX(ingested_at) refreshed_at FROM {CATALOG}.03_gold.dp11_consent_propagation_status GROUP BY target_system,target_status""")

@dp.materialized_view(name="vw_cio_service_trend", comment="Synthetic CIO service metrics")
def vw_cio_service_trend():
 return spark.table(f"{CATALOG}.01_bronze.platform_sla_metrics").select("metric_date","metric_name","metric_value","target_value","status")

@dp.materialized_view(name="vw_platform_source_health", comment="Synthetic source operations dataset")
def vw_platform_source_health():
 return spark.table(f"{CATALOG}.01_bronze.source_health").select("source_id","source_name","domain","freshness_minutes","freshness_status","lifecycle_status")
