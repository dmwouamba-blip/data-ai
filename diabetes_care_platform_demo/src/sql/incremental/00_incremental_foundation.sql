CREATE SCHEMA IF NOT EXISTS dcp_synth.`00_config`;
CREATE SCHEMA IF NOT EXISTS dcp_synth.`09_test`;

CREATE TABLE IF NOT EXISTS dcp_synth.`00_config`.generator_state (
  source_id STRING NOT NULL,
  last_sequence BIGINT NOT NULL,
  last_event_time TIMESTAMP,
  last_successful_run_id STRING,
  updated_at TIMESTAMP NOT NULL
) USING DELTA;

CREATE TABLE IF NOT EXISTS dcp_synth.`00_config`.generator_runs (
  run_id STRING NOT NULL,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  status STRING NOT NULL,
  error_message STRING
) USING DELTA;

CREATE TABLE IF NOT EXISTS dcp_synth.`00_config`.generator_manifest (
  run_id STRING NOT NULL,
  source_id STRING NOT NULL,
  dataset_name STRING NOT NULL,
  output_path STRING NOT NULL,
  record_count BIGINT NOT NULL,
  min_event_time TIMESTAMP,
  max_event_time TIMESTAMP,
  schema_version STRING NOT NULL,
  generated_at TIMESTAMP NOT NULL
) USING DELTA;

CREATE OR REPLACE VIEW dcp_synth.`09_test`.v_incremental_manifest_reconciliation AS
SELECT m.run_id, m.source_id, m.dataset_name, m.output_path, m.record_count AS expected_rows,
       m.min_event_time, m.max_event_time, m.generated_at
FROM dcp_synth.`00_config`.generator_manifest m;
