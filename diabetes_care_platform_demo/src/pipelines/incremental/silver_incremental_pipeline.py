# Databricks notebook source
from pyspark import pipelines as dp
from pyspark.sql import functions as F
from pyspark.sql.window import Window
B="dcp_synth.01_bronze_incremental"
def latest(table,key,order):
 w=Window.partitionBy(*key).orderBy(*[F.col(c).desc_nulls_last() for c in order])
 return spark.read.table(f"{B}.{table}").withColumn("_rank",F.row_number().over(w)).where("_rank=1").drop("_rank")
@dp.materialized_view(name="patient_incremental")
def patient(): return latest("patient_master_incremental",["patient_id"],["_generation_ts","ingested_at","_run_id"])
@dp.materialized_view(name="glucose_readings_incremental")
def glucose(): return spark.read.table(f"{B}.cgm_readings_incremental").dropDuplicates(["reading_id"]).withColumn("quality_status",F.when(F.col("glucose_mmol_l").between(1.0,35.0),"PASS").otherwise("FAIL"))
@dp.materialized_view(name="mysugr_logbook_incremental")
def logbook(): return spark.read.table(f"{B}.mysugr_logbook_incremental").dropDuplicates(["entry_id"])
@dp.materialized_view(name="device_events_incremental")
def devices(): return spark.read.table(f"{B}.device_events_incremental").dropDuplicates(["event_id"]).withColumn("device_health",F.when(F.col("battery_pct")<20,"LOW_BATTERY").when(F.col("sync_status")=="FAILED","SYNC_FAILURE").otherwise("HEALTHY"))
@dp.materialized_view(name="consent_events_incremental")
def consent_events(): return spark.read.table(f"{B}.consent_events_incremental").dropDuplicates(["consent_event_id"])
@dp.materialized_view(name="consent_current_incremental")
def consent_current(): return latest("consent_events_incremental",["patient_id","consent_scope"],["event_time","ingested_at","consent_event_id"]).withColumnRenamed("new_state","current_state")
@dp.materialized_view(name="consent_propagation_incremental")
def propagation(): return spark.read.table(f"{B}.consent_propagation_incremental").dropDuplicates(["consent_event_id","target_system"])
@dp.materialized_view(name="patient_alerts_incremental")
def alerts(): return spark.read.table(f"{B}.patient_alerts_incremental").dropDuplicates(["alert_id"])
@dp.materialized_view(name="report_sharing_incremental")
def sharing(): return spark.read.table(f"{B}.report_sharing_incremental").dropDuplicates(["sharing_id"])
