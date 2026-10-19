-- ============================================================
-- DEPLOYABLE TEMPLATE | Databricks SQL
-- File: 14_glucose_management_presentation_views.sql
-- Purpose: Serving views for the Glucose Management Dashboard
-- Scope: synthetic / non-production DCP presentation layer
-- Dependencies:
--   dcp_synth.03_gold.dp01_patient_glucose_timeline
--   dcp_synth.03_gold.dp02_patient_glucose_summary
-- ============================================================

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_presentation`;


-- ============================================================
-- GLUCOSE TIMELINE
-- Grain: glucose measurement/event per patient
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_glucose_timeline AS
SELECT
    patient_id,
    event_time,
    glucose_mmol_l,
    source_id
FROM `03_gold`.dp01_patient_glucose_timeline;


-- ============================================================
-- GLUCOSE DAILY SUMMARY
-- Grain: patient + measure_date
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_glucose_daily_summary AS
SELECT
    patient_id,
    measure_date,
    mean_glucose_mmol_l,
    tir_pct,
    tbr_pct,
    tar_pct,
    reading_count,
    refreshed_at
FROM `03_gold`.dp02_patient_glucose_summary;


-- ============================================================
-- SMOKE CHECKS
-- ============================================================

SELECT
    'vw_glucose_timeline' AS view_name,
    COUNT(*) AS row_count
FROM `04_presentation`.vw_glucose_timeline

UNION ALL

SELECT
    'vw_glucose_daily_summary' AS view_name,
    COUNT(*) AS row_count
FROM `04_presentation`.vw_glucose_daily_summary;


-- ============================================================
-- RANGE CONSISTENCY CHECK
-- Expected for valid summary rows: TIR + TBR + TAR ~= 100
-- This reports violations; zero rows is the desired result.
-- ============================================================

    SELECT
    CASE
        WHEN COUNT(*) = 0 THEN 'PASS'
        ELSE 'FAIL'
    END AS result,
    COUNT(*) AS violation_count
FROM `04_presentation`.vw_glucose_daily_summary
WHERE ABS(
    tir_pct + tbr_pct + tar_pct - 100.0
) > 0.1;
