-- DCP synthetic non-production bootstrap
CREATE CATALOG IF NOT EXISTS dcp_synth;
USE CATALOG dcp_synth;
CREATE SCHEMA IF NOT EXISTS `00_config`;
CREATE SCHEMA IF NOT EXISTS `01_bronze`;
CREATE SCHEMA IF NOT EXISTS `02_silver`;
CREATE SCHEMA IF NOT EXISTS `03_gold`;
CREATE SCHEMA IF NOT EXISTS `04_marketplace`;
CREATE SCHEMA IF NOT EXISTS `05_compliance`;
CREATE SCHEMA IF NOT EXISTS `06_regulatory`;
CREATE SCHEMA IF NOT EXISTS `07_ml`;
CREATE SCHEMA IF NOT EXISTS `08_monitoring`;
CREATE SCHEMA IF NOT EXISTS `09_test`;
CREATE VOLUME IF NOT EXISTS `00_config`.`00_landing`
COMMENT 'Synthetic non-production landing zone; file-first ingestion tests only';
CREATE OR REPLACE TABLE `00_config`.synthetic_parameters USING DELTA AS
SELECT 100 AS patient_count, DATE'2025-10-01' AS history_start_date,
       DATE'2026-09-30' AS history_end_date, 42 AS deterministic_seed,
       TIMESTAMP'2026-10-07 08:00:00' AS fixed_generated_at,
       '/Volumes/dcp_synth/00_config/00_landing' AS landing_root;
CREATE TABLE IF NOT EXISTS `00_config`.ingestion_audit (
 run_id STRING, source_id STRING, target_table STRING, landing_path STRING,
 file_format STRING, status STRING, row_count BIGINT, started_at TIMESTAMP,
 completed_at TIMESTAMP, error_message STRING
) USING DELTA;
