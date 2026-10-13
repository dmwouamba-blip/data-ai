-- ============================================================================
-- DCP DATA QUALITY VALIDATION VIEWS
-- ============================================================================
-- Synthetic environment only
-- Catalog: dcp_synth
-- Schema : 09_test
-- ============================================================================

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `09_test`;

-- ============================================================================
-- Deployment Status
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_heartbeat AS
SELECT
    current_timestamp() AS checked_at,
    'DCP Quality Validation Views Installed' AS status;

-- ============================================================================
-- Patient Master Checks
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_patient_master AS
SELECT
    patient_id,
    display_name,
    birth_date,
    country,
    diabetes_type,
    therapy_profile,
    CASE
        WHEN patient_id IS NULL THEN 'FAIL'
        ELSE 'PASS'
    END AS validation_status
FROM dcp_synth.`01_bronze`.patient_master;

-- ============================================================================
-- CGM Validation
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_cgm_readings AS
SELECT
    reading_id,
    patient_id,
    event_time,
    glucose_mmol_l,

    CASE
        WHEN glucose_mmol_l BETWEEN 1.0 AND 35.0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS glucose_range_check

FROM dcp_synth.`01_bronze`.cgm_readings;

-- ============================================================================
-- Device Validation
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_device_events AS
SELECT
    event_id,
    patient_id,
    device_id,
    battery_pct,

    CASE
        WHEN battery_pct BETWEEN 0 AND 100
        THEN 'PASS'
        ELSE 'FAIL'
    END AS battery_check

FROM dcp_synth.`01_bronze`.device_events;

-- ============================================================================
-- Consent Validation
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_consent_events AS
SELECT
    consent_event_id,
    patient_id,
    consent_scope,
    new_state,

    CASE
        WHEN new_state IN (
            'GRANTED',
            'REVOKED',
            'EXPIRED',
            'CORRECTED'
        )
        THEN 'PASS'
        ELSE 'FAIL'
    END AS consent_state_check

FROM dcp_synth.`01_bronze`.consent_events;

-- ============================================================================
-- Submission Readiness Validation
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_submission_readiness AS
SELECT
    submission_id,
    readiness_pct,

    CASE
        WHEN readiness_pct BETWEEN 0 AND 100
        THEN 'PASS'
        ELSE 'FAIL'
    END AS readiness_check

FROM dcp_synth.`01_bronze`.submission_readiness;

-- ============================================================================
-- Consolidated Validation Summary
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_validation_summary AS

SELECT
    'patient_master' AS dataset_name,
    COUNT(*) AS row_count,
    COUNT_IF(validation_status = 'FAIL') AS failed_records
FROM `09_test`.dq_patient_master

UNION ALL

SELECT
    'cgm_readings',
    COUNT(*),
    COUNT_IF(glucose_range_check = 'FAIL')
FROM `09_test`.dq_cgm_readings

UNION ALL

SELECT
    'device_events',
    COUNT(*),
    COUNT_IF(battery_check = 'FAIL')
FROM `09_test`.dq_device_events

UNION ALL

SELECT
    'consent_events',
    COUNT(*),
    COUNT_IF(consent_state_check = 'FAIL')
FROM `09_test`.dq_consent_events

UNION ALL

SELECT
    'submission_readiness',
    COUNT(*),
    COUNT_IF(readiness_check = 'FAIL')
FROM `09_test`.dq_submission_readiness;

-- ============================================================================
-- Release Gate
-- ============================================================================

CREATE OR REPLACE VIEW `09_test`.dq_release_gate AS

SELECT
    current_timestamp() AS evaluated_at,

    SUM(failed_records) AS total_failed_records,

    CASE
        WHEN SUM(failed_records) = 0
        THEN 'PASS'
        ELSE 'FAIL'
    END AS release_status

FROM `09_test`.dq_validation_summary;