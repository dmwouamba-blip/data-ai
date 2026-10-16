CREATE OR REPLACE VIEW dcp_synth.`09_test`.v_incremental_run_health AS
SELECT run_id, started_at, completed_at, status,
       unix_timestamp(completed_at)-unix_timestamp(started_at) AS duration_seconds,
       error_message
FROM dcp_synth.`00_config`.generator_runs;

CREATE OR REPLACE VIEW dcp_synth.`09_test`.v_incremental_manifest_summary AS
SELECT run_id, count(*) AS dataset_count, sum(record_count) AS generated_rows,
       min(min_event_time) AS min_event_time, max(max_event_time) AS max_event_time,
       max(generated_at) AS generated_at
FROM dcp_synth.`00_config`.generator_manifest
GROUP BY run_id;
