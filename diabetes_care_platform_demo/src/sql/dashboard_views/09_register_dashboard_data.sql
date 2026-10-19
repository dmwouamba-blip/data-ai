-- DEPLOYABLE TEMPLATE | Databricks SQL
-- File 1/2: Dashboard-support staging loads from Unity Catalog Volume.
-- Scope: deterministic synthetic / non-production dashboard data path.
-- Intentionally isolated from pipeline-owned 01_bronze objects.

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_dashboard_stage`;

-- ============================================================
-- Volume files -> dashboard-owned managed Delta staging tables
-- ============================================================

CREATE OR REPLACE TABLE `04_dashboard_stage`.platform_sla_metrics
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/platform_sla_metrics',
  format => 'parquet'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.control_posture
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/control_posture',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.platform_resources
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/platform_resources',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.dashboard_adoption
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/dashboard_adoption',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.release_readiness
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/release_readiness',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.platform_incidents
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/platform_incidents',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.source_health
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/source_health',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.pipeline_runs
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/pipeline_runs',
  format => 'parquet'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.platform_exceptions
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/platform_exceptions',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.access_audit
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/access_audit',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.recovery_state
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-20/recovery_state',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.submission_readiness
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-21/submission_readiness',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.authority_interactions
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-24/authority_interactions',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.compliance_evidence
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-25/compliance_evidence',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.mydiabete_events
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-07/mydiabete_events',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.device_status
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-16/device_events',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.patient_alerts
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-17/patient_alerts',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.consent_events
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-14/consent_events',
  format => 'json'
);

CREATE OR REPLACE TABLE `04_dashboard_stage`.consent_propagation
USING DELTA AS
SELECT * FROM read_files(
  '/Volumes/dcp_synth/00_config/00_landing/SRC-15/consent_propagation',
  format => 'json'
);

-- Smoke check: this file defines 20 staging tables.
SELECT
  'dashboard_stage_tables' AS check_name,
  COUNT(*) AS relation_count
FROM system.information_schema.tables
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '04_dashboard_stage'
  AND table_name IN (
    'platform_sla_metrics', 'control_posture', 'platform_resources',
    'dashboard_adoption', 'release_readiness', 'platform_incidents',
    'source_health', 'pipeline_runs', 'platform_exceptions', 'access_audit',
    'recovery_state', 'submission_readiness', 'authority_interactions',
    'compliance_evidence', 'mydiabete_events', 'device_status',
    'patient_alerts', 'consent_events', 'consent_propagation', 'report_sharing'
  );

-- DEPLOYABLE TEMPLATE | Databricks SQL
-- File 2/2: Dashboard presentation views.
-- Depends on 09_dashboard_stage_loads.sql and existing Gold/regulatory products.

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_presentation`;

-- ============================================================
-- CIO presentation views
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_cio_product_maturity AS
SELECT product_id, maturity, readiness_status, owner, next_action
FROM `04_dashboard_stage`.release_readiness;

CREATE OR REPLACE VIEW `04_presentation`.vw_cio_service_trend AS
SELECT metric_date, metric_name, metric_value, target_value, status
FROM `04_dashboard_stage`.platform_sla_metrics;

CREATE OR REPLACE VIEW `04_presentation`.vw_cio_control_posture AS
SELECT control_domain, score_pct, assessed_at
FROM `04_dashboard_stage`.control_posture;

CREATE OR REPLACE VIEW `04_presentation`.vw_cio_cost_capacity AS
SELECT resource_type, utilization_pct, cost_share_pct, metric_time
FROM `04_dashboard_stage`.platform_resources;

CREATE OR REPLACE VIEW `04_presentation`.vw_cio_release_queue AS
SELECT product_id, maturity, readiness_status, owner, next_action, _run_id
FROM `04_dashboard_stage`.release_readiness
WHERE readiness_status = 'ACTION';

-- ============================================================
-- Regulatory presentation views
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_reg_submission_portfolio AS
SELECT submission_id, product_id, market, authority,  risk_status, owner
FROM `06_regulatory`.submission_master;

CREATE OR REPLACE VIEW `04_presentation`.vw_reg_readiness AS
SELECT * FROM `04_dashboard_stage`.submission_readiness;

CREATE OR REPLACE VIEW `04_presentation`.vw_reg_evidence AS
SELECT * FROM `04_dashboard_stage`.compliance_evidence;

CREATE OR REPLACE VIEW `04_presentation`.vw_reg_authority_queue AS
SELECT *
FROM `04_dashboard_stage`.authority_interactions
WHERE status IN ('OPEN', 'OVERDUE');

CREATE OR REPLACE VIEW `04_presentation`.vw_reg_consent_propagation AS
SELECT patient_id, consent_event_id, target_system AS target_id, target_status AS status,
       event_time, acknowledged_at, failure_reason, _run_id
FROM `04_dashboard_stage`.consent_propagation;

-- ============================================================
-- Platform Admin presentation views
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_admin_source_health AS
SELECT * FROM `04_dashboard_stage`.source_health;

CREATE OR REPLACE VIEW `04_presentation`.vw_admin_pipeline_trend AS
SELECT * FROM `04_dashboard_stage`.pipeline_runs;

CREATE OR REPLACE VIEW `04_presentation`.vw_admin_exception_queue AS
SELECT * FROM `04_dashboard_stage`.platform_exceptions;

CREATE OR REPLACE VIEW `04_presentation`.vw_admin_resource_capacity AS
SELECT * FROM `04_dashboard_stage`.platform_resources;

CREATE OR REPLACE VIEW `04_presentation`.vw_admin_access_recovery AS
SELECT
  event_time,
  event_type,
  principal,
  object_name,
  CAST(NULL AS STRING) AS layer,
  CAST(NULL AS STRING) AS recovery_state,
  _run_id
FROM `04_dashboard_stage`.access_audit
UNION ALL
SELECT
  tested_at AS event_time,
  'RECOVERY' AS event_type,
  CAST(NULL AS STRING) AS principal,
  CAST(NULL AS STRING) AS object_name,
  layer,
  recovery_state,
  _run_id
FROM `04_dashboard_stage`.recovery_state;

-- ============================================================
-- Patient presentation views
-- Apply row-level security before any non-synthetic use.
-- Different grains remain separate to avoid many-to-many multiplication.
-- ============================================================

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_current_status AS
WITH ranked AS (
  SELECT
    patient_id,
    event_time,
    glucose_mmol_l,
    source_id,
    ROW_NUMBER() OVER (
      PARTITION BY patient_id
      ORDER BY event_time DESC
    ) AS rn
  FROM `03_gold`.dp01_patient_glucose_timeline
)
SELECT patient_id, event_time, glucose_mmol_l, source_id
FROM ranked
WHERE rn = 1;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_glucose_timeline AS
SELECT * FROM `03_gold`.dp01_patient_glucose_timeline;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_summary AS
SELECT * FROM `03_gold`.dp02_patient_glucose_summary;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_events AS
SELECT event_id, patient_id, event_type, event_time, quantity, sync_status, _run_id
FROM `04_dashboard_stage`.mydiabete_events;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_device_status AS
SELECT patient_id, device_id, battery_pct, sync_status, ingested_at,
       NULL AS firmware_version, _run_id
FROM `04_dashboard_stage`.device_status;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_consent_status AS
SELECT patient_id, consent_event_id, consent_scope, NULL AS event_type,
       new_state AS consent_state, purpose, event_time, _run_id
FROM `04_dashboard_stage`.consent_events;

CREATE OR REPLACE VIEW `04_presentation`.vw_patient_consent_propagation AS
SELECT patient_id, consent_event_id, NULL AS consent_scope, target_system AS target_id, 
       target_status AS propagation_status, event_time, acknowledged_at,
       failure_reason, _run_id
FROM `04_dashboard_stage`.consent_propagation;

-- CREATE OR REPLACE VIEW `04_presentation`.vw_patient_report_sharing AS
-- SELECT sharing_id, patient_id, report_id, recipient_type,
--        sharing_status, shared_at, _run_id
-- FROM `04_dashboard_stage`.report_sharing;

-- Smoke check.
SELECT
  'presentation_views' AS check_name,
  COUNT(*) AS view_count
FROM system.information_schema.views
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '04_presentation';