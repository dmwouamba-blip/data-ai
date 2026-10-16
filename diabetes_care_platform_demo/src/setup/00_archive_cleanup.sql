-- Synthetic reset. Managed-table history is not retained after DROP.
-- Landing files remain in the managed volume and are overwritten by fixed RUN_ID.
USE CATALOG dcp_synth;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp01_patient_glucose_timeline;
DROP TABLE IF EXISTS `03_gold`.dp02_patient_glucose_summary;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp03_patient_self_management_events;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp09_patient_device_status;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp10_patient_consent_current;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp11_consent_propagation_status;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp15_healthcare_compliance_monitoring;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp16_regulatory_product_master;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp19_regulatory_submission_master;
DROP MATERIALIZED VIEW IF EXISTS `03_gold`.dp21_regulatory_authority_interactions;
DROP MATERIALIZED VIEW IF EXISTS `02_silver`.patient;
DROP MATERIALIZED VIEW IF EXISTS `02_silver`.glucose_readings;
DROP MATERIALIZED VIEW IF EXISTS `02_silver`.consent_events;
DROP TABLE IF EXISTS `01_bronze`.patient_master;
DROP TABLE IF EXISTS `01_bronze`.cgm_readings;
DROP TABLE IF EXISTS `01_bronze`.mysugr_logbook;
DROP TABLE IF EXISTS `01_bronze`.device_events;
DROP TABLE IF EXISTS `01_bronze`.consent_events;
DROP TABLE IF EXISTS `01_bronze`.consent_propagation;
DROP TABLE IF EXISTS `05_compliance`.controls;
DROP TABLE IF EXISTS `05_compliance`.control_assessments;
DROP TABLE IF EXISTS `06_regulatory`.product_master;
DROP TABLE IF EXISTS `06_regulatory`.submission_master;
DROP TABLE IF EXISTS `06_regulatory`.authority_interactions;
DROP TABLE IF EXISTS `09_test`.deployment_results;
