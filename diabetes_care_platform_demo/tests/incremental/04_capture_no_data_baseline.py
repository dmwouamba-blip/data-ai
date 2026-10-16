# Databricks notebook source
"""Capture counts before pipeline-only rerun."""

# COMMAND ----------
relations = [
    "dcp_synth.01_bronze_incremental.patient_master_incremental",
    "dcp_synth.01_bronze_incremental.cgm_readings_incremental",
    "dcp_synth.01_bronze_incremental.mysugr_logbook_incremental",
    "dcp_synth.01_bronze_incremental.device_events_incremental",
    "dcp_synth.01_bronze_incremental.consent_events_incremental",
    "dcp_synth.01_bronze_incremental.consent_propagation_incremental",
    "dcp_synth.01_bronze_incremental.patient_alerts_incremental",
    "dcp_synth.01_bronze_incremental.report_sharing_incremental",
    "dcp_synth.02_silver_incremental.glucose_readings_incremental",
    "dcp_synth.03_gold_incremental.dp02_patient_glucose_summary_incremental",
]
counts = {relation: spark.table(relation).count() for relation in relations}
dbutils.jobs.taskValues.set(key="no_data_baseline", value=counts)
print(counts)
