# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# DBTITLE 1,Cell 1
"""DCP Bronze Lakeflow Pipeline, batch materialized-view implementation.

Synthetic non-production only.
Uses fixed Unity Catalog paths and explicit schemas to avoid schema-inference
failures when JSON directories are empty or contain nested run directories.
"""

from pyspark import pipelines as dp
from pyspark.sql import types as T


# -----------------------------------------------------------------------------
# Fixed DCP configuration
# -----------------------------------------------------------------------------

CATALOG = "dcp_synth"
ROOT = "/Volumes/dcp_synth/00_config/00_landing"


# -----------------------------------------------------------------------------
# Shared readers
# -----------------------------------------------------------------------------

def read_json(relative_path: str, schema: T.StructType):
    return (
        spark.read
        .schema(schema)
        .option("recursiveFileLookup", "true")
        .json(f"{ROOT}/{relative_path}")
    )


def read_csv(relative_path: str, schema: T.StructType):
    return (
        spark.read
        .schema(schema)
        .option("header", "true")
        .option("recursiveFileLookup", "true")
        .csv(f"{ROOT}/{relative_path}")
    )


def read_parquet(relative_path: str, schema: T.StructType):
    return (
        spark.read
        .schema(schema)
        .option("recursiveFileLookup", "true")
        .parquet(f"{ROOT}/{relative_path}")
    )


# -----------------------------------------------------------------------------
# Healthcare and patient schemas
# -----------------------------------------------------------------------------

PATIENT_SCHEMA = T.StructType([
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("display_name", T.StringType(), True),
    T.StructField("birth_date", T.DateType(), True),
    T.StructField("country", T.StringType(), True),
    T.StructField("diabetes_type", T.StringType(), True),
    T.StructField("therapy_profile", T.StringType(), True),
    T.StructField("data_class", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

CGM_SCHEMA = T.StructType([
    T.StructField("reading_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("event_time", T.TimestampType(), False),
    T.StructField("glucose_mmol_l", T.DoubleType(), True),
    T.StructField("trend", T.StringType(), True),
    T.StructField("device_id", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

MYSUGR_LOGBOOK_SCHEMA = T.StructType([
    T.StructField("entry_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("event_date", T.DateType(), True),
    T.StructField("event_time", T.TimestampType(), True),
    T.StructField("event_type", T.StringType(), True),
    T.StructField("carbohydrates_g", T.LongType(), True),
    T.StructField("insulin_units", T.DoubleType(), True),
    T.StructField("source_application", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

DEVICE_EVENT_SCHEMA = T.StructType([
    T.StructField("event_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("device_id", T.StringType(), False),
    T.StructField("event_date", T.DateType(), True),
    T.StructField("event_time", T.TimestampType(), True),
    T.StructField("battery_pct", T.LongType(), True),
    T.StructField("sync_status", T.StringType(), True),
    T.StructField("error_code", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

CONSENT_EVENT_SCHEMA = T.StructType([
    T.StructField("consent_event_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("consent_scope", T.StringType(), False),
    T.StructField("purpose", T.StringType(), True),
    T.StructField("recipient", T.StringType(), True),
    T.StructField("previous_state", T.StringType(), True),
    T.StructField("new_state", T.StringType(), True),
    T.StructField("event_time", T.TimestampType(), True),
    T.StructField("source_application", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

CONSENT_PROPAGATION_SCHEMA = T.StructType([
    T.StructField("consent_event_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), True),
    T.StructField("target_system", T.StringType(), True),
    T.StructField("target_status", T.StringType(), True),
    T.StructField("submitted_at", T.TimestampType(), True),
    T.StructField("acknowledged_at", T.TimestampType(), True),
    T.StructField("failure_reason", T.StringType(), True),
    T.StructField("correlation_id", T.StringType(), True),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("ingested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

PATIENT_ALERT_SCHEMA = T.StructType([
    T.StructField("alert_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("alert_type", T.StringType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("created_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

REPORT_SHARING_SCHEMA = T.StructType([
    T.StructField("sharing_id", T.StringType(), False),
    T.StructField("patient_id", T.StringType(), False),
    T.StructField("report_id", T.StringType(), True),
    T.StructField("recipient_type", T.StringType(), True),
    T.StructField("sharing_status", T.StringType(), True),
    T.StructField("shared_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])


# -----------------------------------------------------------------------------
# Platform-operation schemas
# -----------------------------------------------------------------------------

PLATFORM_SLA_SCHEMA = T.StructType([
    T.StructField("metric_date", T.DateType(), False),
    T.StructField("metric_name", T.StringType(), False),
    T.StructField("metric_value", T.DoubleType(), True),
    T.StructField("target_value", T.DoubleType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

CONTROL_POSTURE_SCHEMA = T.StructType([
    T.StructField("control_domain", T.StringType(), False),
    T.StructField("score_pct", T.DoubleType(), True),
    T.StructField("assessed_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

PLATFORM_RESOURCE_SCHEMA = T.StructType([
    T.StructField("resource_type", T.StringType(), False),
    T.StructField("utilization_pct", T.DoubleType(), True),
    T.StructField("cost_share_pct", T.DoubleType(), True),
    T.StructField("metric_time", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

DASHBOARD_ADOPTION_SCHEMA = T.StructType([
    T.StructField("experience", T.StringType(), False),
    T.StructField("eligible_users", T.LongType(), True),
    T.StructField("active_users", T.LongType(), True),
    T.StructField("metric_date", T.DateType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

RELEASE_READINESS_SCHEMA = T.StructType([
    T.StructField("product_id", T.StringType(), False),
    T.StructField("maturity", T.StringType(), True),
    T.StructField("readiness_status", T.StringType(), True),
    T.StructField("owner", T.StringType(), True),
    T.StructField("next_action", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

PLATFORM_INCIDENT_SCHEMA = T.StructType([
    T.StructField("incident_id", T.StringType(), False),
    T.StructField("severity", T.StringType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("opened_date", T.DateType(), True),
    T.StructField("owner", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

SOURCE_HEALTH_SCHEMA = T.StructType([
    T.StructField("source_id", T.StringType(), False),
    T.StructField("source_name", T.StringType(), True),
    T.StructField("domain", T.StringType(), True),
    T.StructField("freshness_minutes", T.LongType(), True),
    T.StructField("freshness_status", T.StringType(), True),
    T.StructField("lifecycle_status", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

PIPELINE_RUN_SCHEMA = T.StructType([
    T.StructField("pipeline_run_id", T.StringType(), False),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("started_at", T.TimestampType(), True),
    T.StructField("duration_seconds", T.LongType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

PLATFORM_EXCEPTION_SCHEMA = T.StructType([
    T.StructField("exception_id", T.StringType(), False),
    T.StructField("source_id", T.StringType(), True),
    T.StructField("exception_type", T.StringType(), True),
    T.StructField("severity", T.StringType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("owner", T.StringType(), True),
    T.StructField("next_action", T.StringType(), True),
    T.StructField("opened_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

ACCESS_AUDIT_SCHEMA = T.StructType([
    T.StructField("audit_event_id", T.StringType(), False),
    T.StructField("event_type", T.StringType(), True),
    T.StructField("principal", T.StringType(), True),
    T.StructField("object_name", T.StringType(), True),
    T.StructField("event_time", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

RECOVERY_STATE_SCHEMA = T.StructType([
    T.StructField("layer", T.StringType(), False),
    T.StructField("recovery_state", T.StringType(), True),
    T.StructField("rto_hours", T.LongType(), True),
    T.StructField("rpo_hours", T.LongType(), True),
    T.StructField("tested_at", T.TimestampType(), True),
    T.StructField("_run_id", T.StringType(), True),
])


# -----------------------------------------------------------------------------
# Regulatory and compliance schemas
# -----------------------------------------------------------------------------

SUBMISSION_READINESS_SCHEMA = T.StructType([
    T.StructField("submission_id", T.StringType(), False),
    T.StructField("required_items", T.LongType(), True),
    T.StructField("complete_items", T.LongType(), True),
    T.StructField("readiness_pct", T.DoubleType(), True),
    T.StructField("exception_count", T.LongType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

COMPLIANCE_EVIDENCE_SCHEMA = T.StructType([
    T.StructField("control_id", T.StringType(), False),
    T.StructField("domain", T.StringType(), True),
    T.StructField("evidence_status", T.StringType(), True),
    T.StructField("assessed_date", T.DateType(), True),
    T.StructField("owner", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])

DASHBOARD_AUTHORITY_INTERACTION_SCHEMA = T.StructType([
    T.StructField("interaction_id", T.StringType(), False),
    T.StructField("submission_id", T.StringType(), False),
    T.StructField("interaction_type", T.StringType(), True),
    T.StructField("status", T.StringType(), True),
    T.StructField("due_date", T.DateType(), True),
    T.StructField("owner", T.StringType(), True),
    T.StructField("_run_id", T.StringType(), True),
])


# -----------------------------------------------------------------------------
# Healthcare materialized views
# -----------------------------------------------------------------------------

@dp.materialized_view(name="patient_master", comment="Synthetic source-aligned patient master")

def patient_master():
    return read_csv("SRC-11/patient_master", PATIENT_SCHEMA)


@dp.materialized_view(name="cgm_readings", comment="Synthetic CGM events")


def cgm_readings():
    return read_parquet("SRC-01/cgm_readings", CGM_SCHEMA)


@dp.materialized_view(name="mysugr_logbook", comment="Synthetic patient logbook events")

def mysugr_logbook():
    return read_json("SRC-06/mysugr_logbook", MYSUGR_LOGBOOK_SCHEMA)


@dp.materialized_view(name="device_events", comment="Synthetic device and synchronization events")

def device_events():
    return read_json("SRC-16/device_events", DEVICE_EVENT_SCHEMA)


@dp.materialized_view(name="consent_events", comment="Synthetic immutable consent lifecycle events")


def consent_events():
    return read_json("SRC-14/consent_events", CONSENT_EVENT_SCHEMA)


@dp.materialized_view(name="consent_propagation", comment="Synthetic consent propagation acknowledgements")

def consent_propagation():
    return read_json("SRC-15/consent_propagation", CONSENT_PROPAGATION_SCHEMA)


# -----------------------------------------------------------------------------
# Platform and dashboard materialized views
# -----------------------------------------------------------------------------

@dp.materialized_view(name="platform_sla_metrics", comment="Synthetic platform SLA metrics")
def platform_sla_metrics():
    return read_parquet("SRC-20/platform_sla_metrics", PLATFORM_SLA_SCHEMA)


@dp.materialized_view(name="control_posture", comment="Synthetic control posture metrics")
def control_posture():
    return read_json("SRC-20/control_posture", CONTROL_POSTURE_SCHEMA)


@dp.materialized_view(name="platform_resources", comment="Synthetic platform resource metrics")
def platform_resources():
    return read_json("SRC-20/platform_resources", PLATFORM_RESOURCE_SCHEMA)


@dp.materialized_view(name="dashboard_adoption", comment="Synthetic dashboard adoption metrics")

def dashboard_adoption():
    return read_json("SRC-20/dashboard_adoption", DASHBOARD_ADOPTION_SCHEMA)


@dp.materialized_view(name="release_readiness", comment="Synthetic data-product release readiness")
def release_readiness():
    return read_json("SRC-20/release_readiness", RELEASE_READINESS_SCHEMA)


@dp.materialized_view(name="platform_incidents", comment="Synthetic platform incidents")

def platform_incidents():
    return read_json("SRC-20/platform_incidents", PLATFORM_INCIDENT_SCHEMA)


@dp.materialized_view(name="source_health", comment="Synthetic source-health metrics")

def source_health():
    return read_json("SRC-20/source_health", SOURCE_HEALTH_SCHEMA)


@dp.materialized_view(name="pipeline_runs", comment="Synthetic pipeline execution history")
def pipeline_runs():
    return read_parquet("SRC-20/pipeline_runs", PIPELINE_RUN_SCHEMA)


@dp.materialized_view(name="platform_exceptions", comment="Synthetic platform exception queue")

def platform_exceptions():
    return read_json("SRC-20/platform_exceptions", PLATFORM_EXCEPTION_SCHEMA)


@dp.materialized_view(name="access_audit", comment="Synthetic access-audit events")

def access_audit():
    return read_json("SRC-20/access_audit", ACCESS_AUDIT_SCHEMA)


@dp.materialized_view(name="recovery_state", comment="Synthetic platform recovery state")
def recovery_state():
    return read_json("SRC-20/recovery_state", RECOVERY_STATE_SCHEMA)


# -----------------------------------------------------------------------------
# Regulatory and compliance materialized views
# -----------------------------------------------------------------------------

@dp.materialized_view(name="submission_readiness", comment="Synthetic regulatory submission readiness")


def submission_readiness():
    return read_json("SRC-21/submission_readiness", SUBMISSION_READINESS_SCHEMA)


@dp.materialized_view(name="compliance_evidence", comment="Synthetic compliance evidence status")

def compliance_evidence():
    return read_json("SRC-25/compliance_evidence", COMPLIANCE_EVIDENCE_SCHEMA)


@dp.materialized_view(name="dashboard_authority_interactions", comment="Synthetic regulatory authority action queue")

def dashboard_authority_interactions():
    return read_json("SRC-24/dashboard_authority_interactions", DASHBOARD_AUTHORITY_INTERACTION_SCHEMA)


# -----------------------------------------------------------------------------
# Patient-experience materialized views
# -----------------------------------------------------------------------------

@dp.materialized_view(name="patient_alerts", comment="Synthetic patient alerts")

def patient_alerts():
    return read_json("SRC-17/patient_alerts", PATIENT_ALERT_SCHEMA)


@dp.materialized_view(name="report_sharing", comment="Synthetic report-sharing history")

def report_sharing():
    return read_json("SRC-07/report_sharing", REPORT_SHARING_SCHEMA)