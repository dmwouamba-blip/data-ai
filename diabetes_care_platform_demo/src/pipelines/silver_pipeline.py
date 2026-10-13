# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# Databricks notebook source

from pyspark import pipelines as dp
from pyspark.sql import functions as F
from pyspark.sql.window import Window

CATALOG = "dcp_synth"


# ============================================================================
# Patient
# ============================================================================

@dp.materialized_view(
    name="patient"
)
def patient():

    return (
        spark.read.table(
            f"{CATALOG}.01_bronze.patient_master"
        )
        .select(
            "patient_id",
            "birth_date",
            "country",
            "diabetes_type",
            "therapy_profile"
        )
    )


# ============================================================================
# Glucose Readings
# ============================================================================

@dp.materialized_view(
    name="glucose_readings"
)
def glucose_readings():

    return (
        spark.read.table(
            f"{CATALOG}.01_bronze.cgm_readings"
        )

        .withColumn(
            "quality_status",
            F.when(
                (F.col("glucose_mmol_l") >= F.lit(1.0))
                & (F.col("glucose_mmol_l") <= F.lit(35.0)),
                F.lit("PASS")
            ).otherwise(
                F.lit("FAIL")
            )
        )

        .select(
            "reading_id",
            "patient_id",
            "event_time",
            "glucose_mmol_l",
            "trend",
            "device_id",
            "source_id",
            "ingested_at",
            "_run_id",
            "quality_status"
        )
    )


# ============================================================================
# Consent Events
# ============================================================================

@dp.materialized_view(
    name="consent_events"
)
def consent_events():

    return (
        spark.read.table(
            f"{CATALOG}.01_bronze.consent_events"
        )

        .withColumn(
            "state_rank",
            F.row_number().over(
                Window.partitionBy(
                    "patient_id",
                    "consent_scope"
                ).orderBy(
                    F.col("event_time").desc(),
                    F.col("ingested_at").desc()
                )
            )
        )
    )


# ============================================================================
# Device Status
# ============================================================================

@dp.materialized_view(
    name="device_status"
)
def device_status():

    return (
        spark.read.table(
            f"{CATALOG}.01_bronze.device_events"
        )

        .withColumn(
            "device_health",
            F.when(
                F.col("battery_pct") >= 20,
                F.lit("HEALTHY")
            ).otherwise(
                F.lit("LOW_BATTERY")
            )
        )
    )