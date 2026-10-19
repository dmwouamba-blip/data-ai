-- ============================================================
-- DEPLOYABLE TEMPLATE | Databricks SQL
-- Dashboard Presentation Views
-- ============================================================

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_presentation`;


-- ============================================================
-- CIO PRESENTATION VIEWS
-- ============================================================

-- Service SLA trend
CREATE OR REPLACE VIEW `04_presentation`.vw_cio_service_trend AS
SELECT
    metric_date,
    metric_name,
    metric_value,
    target_value,
    status
FROM `01_bronze`.platform_sla_metrics;


-- Control posture
CREATE OR REPLACE VIEW `04_presentation`.vw_cio_control_posture AS
SELECT
    control_domain,
    score_pct,
    assessed_at
FROM `01_bronze`.control_posture;


-- Resource utilization and cost mix
CREATE OR REPLACE VIEW `04_presentation`.vw_cio_resource_mix AS
SELECT
    resource_type,
    utilization_pct,
    cost_share_pct,
    metric_time
FROM `01_bronze`.platform_resources;


-- Dashboard adoption
CREATE OR REPLACE VIEW `04_presentation`.vw_cio_adoption AS
SELECT
    experience,
    eligible_users,
    active_users,
    ROUND(
        100.0 * active_users / NULLIF(eligible_users, 0),
        2
    ) AS adoption_pct,
    metric_date
FROM `01_bronze`.dashboard_adoption;


-- Release readiness
CREATE OR REPLACE VIEW `04_presentation`.vw_cio_release_readiness AS
SELECT
    product_id,
    maturity,
    readiness_status,
    owner,
    next_action
FROM `01_bronze`.release_readiness;


-- ============================================================
-- PLATFORM ADMIN PRESENTATION VIEWS
-- ============================================================

-- Source freshness and lifecycle
CREATE OR REPLACE VIEW `04_presentation`.vw_platform_source_health AS
SELECT
    source_id,
    source_name,
    domain,
    freshness_minutes,
    freshness_status,
    lifecycle_status
FROM `01_bronze`.source_health;


-- Pipeline execution history
CREATE OR REPLACE VIEW `04_presentation`.vw_platform_pipeline_runs AS
SELECT
    pipeline_run_id,
    source_id,
    started_at,
    duration_seconds,
    status
FROM `01_bronze`.pipeline_runs;


-- Platform exception queue
CREATE OR REPLACE VIEW `04_presentation`.vw_platform_exception_queue AS
SELECT
    exception_id,
    source_id,
    exception_type,
    severity,
    status,
    owner,
    next_action,
    opened_at
FROM `01_bronze`.platform_exceptions;


-- Recovery posture
CREATE OR REPLACE VIEW `04_presentation`.vw_platform_recovery AS
SELECT
    layer,
    recovery_state,
    rto_hours,
    rpo_hours,
    tested_at
FROM `01_bronze`.recovery_state;


-- ============================================================
-- PATIENT PRESENTATION VIEWS
-- ============================================================

-- Patient alerts
CREATE OR REPLACE VIEW `04_presentation`.vw_patient_alerts AS
SELECT
    alert_id,
    patient_id,
    alert_type,
    status,
    created_at
FROM `01_bronze`.patient_alerts;


-- Patient report sharing
CREATE OR REPLACE VIEW `04_presentation`.vw_patient_report_sharing AS
SELECT
    sharing_id,
    patient_id,
    report_id,
    recipient_type,
    sharing_status,
    shared_at
FROM `01_bronze`.report_sharing;