# Databricks notebook source
"""Generate one immutable DCP incremental landing run for eight known sources."""

# COMMAND ----------

from datetime import datetime, timezone, timedelta
from uuid import uuid4
from pyspark.sql import functions as F

ROOT = "/Volumes/dcp_synth/00_config/00_landing"
STATE_TABLE = "dcp_synth.00_config.generator_state"
RUN_TABLE = "dcp_synth.00_config.generator_runs"
MANIFEST_TABLE = "dcp_synth.00_config.generator_manifest"
SCHEMA_VERSION = "1.0"
run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "_" + uuid4().hex[:8]
started = datetime.now(timezone.utc).replace(microsecond=0)

spark.createDataFrame([(run_id, started, None, "RUNNING", None)],
 "run_id string, started_at timestamp, completed_at timestamp, status string, error_message string").write.mode("append").saveAsTable(RUN_TABLE)

# COMMAND ----------

def get_state(source_id: str) -> int:
    rows = spark.table(STATE_TABLE).where(F.col("source_id") == source_id).limit(1).collect()
    return int(rows[0]["last_sequence"]) if rows else 0

def write_dataset(df, source_id: str, dataset: str, fmt: str, event_col: str):
    path = f"{ROOT}/{source_id}/{dataset}/run_id={run_id}"
    out = df.withColumn("_run_id", F.lit(run_id)).withColumn("_generation_ts", F.current_timestamp())
    writer = out.write.mode("error")
    if fmt == "csv": writer.option("header", "true").csv(path)
    elif fmt == "parquet": writer.parquet(path)
    elif fmt == "json": writer.json(path)
    else: raise ValueError(f"Unsupported format: {fmt}")
    stats = out.agg(F.count("*").alias("n"),F.min(event_col).alias("mn"),F.max(event_col).alias("mx")).first()
    manifest = spark.createDataFrame([(run_id,source_id,dataset,path,int(stats.n),stats.mn,stats.mx,SCHEMA_VERSION)],
      "run_id string, source_id string, dataset_name string, output_path string, record_count long, min_event_time timestamp, max_event_time timestamp, schema_version string")
    manifest.withColumn("generated_at",F.current_timestamp()).write.mode("append").saveAsTable(MANIFEST_TABLE)
    return int(stats.n)

def update_state(source_id: str, sequence: int, event_time):
    spark.createDataFrame([(source_id,sequence,event_time,run_id,datetime.now(timezone.utc).replace(microsecond=0))],
      "source_id string,last_sequence long,last_event_time timestamp,last_successful_run_id string,updated_at timestamp").createOrReplaceTempView("state_update")
    spark.sql(f"""MERGE INTO {STATE_TABLE} t USING state_update s ON t.source_id=s.source_id
      WHEN MATCHED THEN UPDATE SET * WHEN NOT MATCHED THEN INSERT *""")

# COMMAND ----------

try:
    pseq=get_state("SRC-11")
    patients=spark.range(pseq+1,pseq+6).select(
      F.format_string("SYN-P-%06d",F.col("id")).alias("patient_id"),
      F.concat(F.lit("Synthetic-"),F.col("id")).alias("display_name"),
      F.date_sub(F.current_date(),(F.col("id")%20000).cast("int")).alias("birth_date"),
      F.lit("CH").alias("country"),F.when(F.col("id")%2==0,"T1D").otherwise("T2D").alias("diabetes_type"),
      F.lit("CGM").alias("therapy_profile"),F.lit("SYNTHETIC").alias("data_class"),
      F.lit("SRC-11").alias("source_id"),F.current_timestamp().alias("ingested_at"))
    write_dataset(patients,"SRC-11","patient_master","csv","ingested_at")

    existing=spark.table("dcp_synth.01_bronze.patient_master").select("patient_id") if spark.catalog.tableExists("dcp_synth.01_bronze.patient_master") else patients.select("patient_id")
    population=existing.unionByName(patients.select("patient_id")).dropDuplicates(["patient_id"])
    start=started-timedelta(hours=1)
    ticks=spark.range(12).select((F.lit(start).cast("timestamp")+F.expr("INTERVAL 5 MINUTES")*F.col("id")).alias("event_time"))
    cgm=population.crossJoin(ticks).withColumn("reading_id",F.sha2(F.concat_ws("|","patient_id",F.col("event_time").cast("string")),256)).withColumn("glucose_mmol_l",F.round(F.lit(6.0)+F.pmod(F.xxhash64("patient_id","event_time"),300)/100.0,1)).withColumn("trend",F.lit("FLAT")).withColumn("device_id",F.concat(F.lit("DEV-"),F.col("patient_id"))).withColumn("source_id",F.lit("SRC-01")).withColumn("ingested_at",F.current_timestamp()).select("reading_id","patient_id","event_time","glucose_mmol_l","trend","device_id","source_id","ingested_at")
    write_dataset(cgm,"SRC-01","cgm_readings","parquet","event_time")

    sample=population.limit(25)
    logbook=sample.withColumn("entry_id",F.sha2(F.concat_ws("|","patient_id",F.lit(run_id),F.lit("log")),256)).withColumn("event_date",F.current_date()).withColumn("event_time",F.current_timestamp()).withColumn("event_type",F.lit("MEAL")).withColumn("carbohydrates_g",F.lit(45)).withColumn("insulin_units",F.lit(4.5)).withColumn("source_application",F.lit("mySugr")).withColumn("source_id",F.lit("SRC-06")).withColumn("ingested_at",F.current_timestamp()).select("entry_id","patient_id","event_date","event_time","event_type","carbohydrates_g","insulin_units","source_application","source_id","ingested_at")
    write_dataset(logbook,"SRC-06","mysugr_logbook","json","event_time")

    devices=sample.withColumn("event_id",F.sha2(F.concat_ws("|","patient_id",F.lit(run_id),F.lit("device")),256)).withColumn("device_id",F.concat(F.lit("DEV-"),F.col("patient_id"))).withColumn("event_date",F.current_date()).withColumn("event_time",F.current_timestamp()).withColumn("battery_pct",F.lit(80)).withColumn("sync_status",F.lit("SUCCESS")).withColumn("error_code",F.lit(None).cast("string")).withColumn("source_id",F.lit("SRC-16")).withColumn("ingested_at",F.current_timestamp()).select("event_id","patient_id","device_id","event_date","event_time","battery_pct","sync_status","error_code","source_id","ingested_at")
    write_dataset(devices,"SRC-16","device_events","json","event_time")

    consent=sample.withColumn("consent_event_id",F.sha2(F.concat_ws("|","patient_id",F.lit(run_id),F.lit("consent")),256)).withColumn("consent_scope",F.lit("CARE_ANALYTICS")).withColumn("purpose",F.lit("Synthetic demonstration")).withColumn("recipient",F.lit("DCP")).withColumn("previous_state",F.lit(None).cast("string")).withColumn("new_state",F.lit("GRANTED")).withColumn("event_time",F.current_timestamp()).withColumn("source_application",F.lit("DCP")).withColumn("source_id",F.lit("SRC-14")).withColumn("ingested_at",F.current_timestamp()).select("consent_event_id","patient_id","consent_scope","purpose","recipient","previous_state","new_state","event_time","source_application","source_id","ingested_at")
    write_dataset(consent,"SRC-14","consent_events","json","event_time")

    propagation=consent.select("consent_event_id","patient_id").withColumn("target_system",F.lit("ANALYTICS")).withColumn("target_status",F.lit("COMPLETED")).withColumn("submitted_at",F.current_timestamp()).withColumn("acknowledged_at",F.current_timestamp()).withColumn("failure_reason",F.lit(None).cast("string")).withColumn("correlation_id",F.sha2(F.concat_ws("|","consent_event_id",F.lit("ANALYTICS")),256)).withColumn("source_id",F.lit("SRC-15")).withColumn("ingested_at",F.current_timestamp())
    write_dataset(propagation,"SRC-15","consent_propagation","json","submitted_at")

    alerts=sample.withColumn("alert_id",F.sha2(F.concat_ws("|","patient_id",F.lit(run_id),F.lit("alert")),256)).withColumn("alert_type",F.lit("INFORMATIONAL")).withColumn("status",F.lit("OPEN")).withColumn("created_at",F.current_timestamp()).select("alert_id","patient_id","alert_type","status","created_at")
    write_dataset(alerts,"SRC-17","patient_alerts","json","created_at")

    sharing=sample.withColumn("sharing_id",F.sha2(F.concat_ws("|","patient_id",F.lit(run_id),F.lit("share")),256)).withColumn("report_id",F.concat(F.lit("RPT-"),F.col("patient_id"))).withColumn("recipient_type",F.lit("CARE_TEAM")).withColumn("sharing_status",F.lit("SHARED")).withColumn("shared_at",F.current_timestamp()).select("sharing_id","patient_id","report_id","recipient_type","sharing_status","shared_at")
    write_dataset(sharing,"SRC-07","report_sharing","json","shared_at")

    for source in ["SRC-01","SRC-06","SRC-07","SRC-11","SRC-14","SRC-15","SRC-16","SRC-17"]: update_state(source,pseq+5,started)
    spark.sql(f"UPDATE {RUN_TABLE} SET completed_at=current_timestamp(),status='SUCCEEDED' WHERE run_id='{run_id}'")
    dbutils.jobs.taskValues.set(key="run_id",value=run_id)
    print(f"SUCCESS run_id={run_id}")
except Exception as exc:
    msg=str(exc).replace("'","''")[:4000]
    spark.sql(f"UPDATE {RUN_TABLE} SET completed_at=current_timestamp(),status='FAILED',error_message='{msg}' WHERE run_id='{run_id}'")
    raise