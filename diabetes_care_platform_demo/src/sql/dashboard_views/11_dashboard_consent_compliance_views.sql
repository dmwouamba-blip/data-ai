USE CATALOG dcp_synth; 

CREATE OR REPLACE VIEW `04_presentation`.vw_consent_current_summary AS SELECT consent_scope,purpose,recipient,current_state,COUNT(*) patient_scope_count,MAX(effective_at) latest_effective_at FROM `03_gold`.dp10_patient_consent_current GROUP BY consent_scope,purpose,recipient,current_state; 

CREATE OR REPLACE VIEW `04_presentation`.vw_consent_propagation_summary AS SELECT target_system,target_status,COUNT(*) propagation_count,MAX(ingested_at) refreshed_at FROM `03_gold`.dp11_consent_propagation_status GROUP BY target_system,target_status; 


-- ============================================================
-- DEPLOYABLE TEMPLATE | Databricks SQL
-- Consent Presentation Views
-- ============================================================

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_presentation`;


-- ============================================================
-- CONSENT CURRENT SUMMARY
-- Source: 03_gold.dp10_patient_consent_current
-- Grain:
--   consent_scope + purpose + recipient + current_state
-- ============================================================

CREATE OR REPLACE VIEW
`04_presentation`.vw_consent_current_summary AS

SELECT
    consent_scope,
    purpose,
    recipient,
    current_state,
    COUNT(*) AS patient_scope_count,
    MAX(effective_at) AS latest_effective_at

FROM `03_gold`.dp10_patient_consent_current

GROUP BY
    consent_scope,
    purpose,
    recipient,
    current_state;


-- ============================================================
-- CONSENT PROPAGATION SUMMARY
-- Source: 03_gold.dp11_consent_propagation_status
-- Grain:
--   target_system + target_status
-- ============================================================

CREATE OR REPLACE VIEW
`04_presentation`.vw_consent_propagation_summary AS

SELECT
    target_system,
    target_status,
    COUNT(*) AS propagation_count,
    MAX(ingested_at) AS refreshed_at

FROM `03_gold`.dp11_consent_propagation_status

GROUP BY
    target_system,
    target_status;


-- ============================================================
-- SMOKE CHECKS
-- ============================================================

SELECT
    *
FROM `04_presentation`.vw_consent_current_summary
ORDER BY
    consent_scope,
    purpose,
    recipient,
    current_state;


SELECT
    *
FROM `04_presentation`.vw_consent_propagation_summary
ORDER BY
    target_system,
    target_status;