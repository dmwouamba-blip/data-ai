# Databricks notebook source
from pyspark import pipelines as dp
from pyspark.sql import types as T, functions as F

# Unity Catalog landing volume used by the incremental generator.
R = "/Volumes/dcp_synth/00_config/00_landing"

# Generator metadata appended to every generated dataset.
meta = [
    T.StructField("_run_id", T.StringType()),
    T.StructField("_generation_ts", T.TimestampType()),
]

PAT = T.StructType([
    T.StructField("patient_id", T.StringType()),
    T.StructField("display_name", T.StringType()),
    T.StructField("birth_date", T.DateType()),
    T.StructField("country", T.StringType()),
    T.StructField("diabetes_type", T.StringType()),
    T.StructField("therapy_profile", T.StringType()),
    T.StructField("data_class", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

CGM = T.StructType([
    T.StructField("reading_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("event_time", T.TimestampType()),
    T.StructField("glucose_mmol_l", T.DoubleType()),
    T.StructField("trend", T.StringType()),
    T.StructField("device_id", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

LOG = T.StructType([
    T.StructField("entry_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("event_date", T.DateType()),
    T.StructField("event_time", T.TimestampType()),
    T.StructField("event_type", T.StringType()),
    T.StructField("carbohydrates_g", T.LongType()),
    T.StructField("insulin_units", T.DoubleType()),
    T.StructField("source_application", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

DEV = T.StructType([
    T.StructField("event_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("device_id", T.StringType()),
    T.StructField("event_date", T.DateType()),
    T.StructField("event_time", T.TimestampType()),
    T.StructField("battery_pct", T.LongType()),
    T.StructField("sync_status", T.StringType()),
    T.StructField("error_code", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

CON = T.StructType([
    T.StructField("consent_event_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("consent_scope", T.StringType()),
    T.StructField("purpose", T.StringType()),
    T.StructField("recipient", T.StringType()),
    T.StructField("previous_state", T.StringType()),
    T.StructField("new_state", T.StringType()),
    T.StructField("event_time", T.TimestampType()),
    T.StructField("source_application", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

PROP = T.StructType([
    T.StructField("consent_event_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("target_system", T.StringType()),
    T.StructField("target_status", T.StringType()),
    T.StructField("submitted_at", T.TimestampType()),
    T.StructField("acknowledged_at", T.TimestampType()),
    T.StructField("failure_reason", T.StringType()),
    T.StructField("correlation_id", T.StringType()),
    T.StructField("source_id", T.StringType()),
    T.StructField("ingested_at", T.TimestampType()),
] + meta)

ALERT = T.StructType([
    T.StructField("alert_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("alert_type", T.StringType()),
    T.StructField("status", T.StringType()),
    T.StructField("created_at", T.TimestampType()),
] + meta)

SHARE = T.StructType([
    T.StructField("sharing_id", T.StringType()),
    T.StructField("patient_id", T.StringType()),
    T.StructField("report_id", T.StringType()),
    T.StructField("recipient_type", T.StringType()),
    T.StructField("sharing_status", T.StringType()),
    T.StructField("shared_at", T.TimestampType()),
] + meta)


def load(path, fmt, schema, header=False):
    """Read incremental files with Auto Loader and retain UC-compatible lineage metadata."""
    reader = (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", fmt)
        .schema(schema)
    )

    if header:
        reader = reader.option("header", "true")

    return (
        reader
        .load(path)
        .withColumn("_input_file", F.col("_metadata.file_path"))
        .withColumn("_bronze_ingested_at", F.current_timestamp())
    )


@dp.table(name="patient_master_incremental")
def patient():
    return load(
        f"{R}/SRC-11/patient_master",
        "csv",
        PAT,
        True,
    )


@dp.table(name="cgm_readings_incremental")
def cgm():
    return load(
        f"{R}/SRC-01/cgm_readings",
        "parquet",
        CGM,
    )


@dp.table(name="mysugr_logbook_incremental")
def logbook():
    return load(
        f"{R}/SRC-06/mysugr_logbook",
        "json",
        LOG,
    )


@dp.table(name="device_events_incremental")
def devices():
    return load(
        f"{R}/SRC-16/device_events",
        "json",
        DEV,
    )


@dp.table(name="consent_events_incremental")
def consent():
    return load(
        f"{R}/SRC-14/consent_events",
        "json",
        CON,
    )


@dp.table(name="consent_propagation_incremental")
def propagation():
    return load(
        f"{R}/SRC-15/consent_propagation",
        "json",
        PROP,
    )


@dp.table(name="patient_alerts_incremental")
def alerts():
    return load(
        f"{R}/SRC-17/patient_alerts",
        "json",
        ALERT,
    )


@dp.table(name="report_sharing_incremental")
def sharing():
    return load(
        f"{R}/SRC-07/report_sharing",
        "json",
        SHARE,
    )
