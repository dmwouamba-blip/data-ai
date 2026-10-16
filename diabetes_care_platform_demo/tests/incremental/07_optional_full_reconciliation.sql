-- Optional parity report. Do not use as a hard gate unless the full-refresh and
-- incremental paths cover the same source horizon.
CREATE OR REPLACE VIEW dcp_synth.`09_test`.v_incremental_full_cgm_reconciliation AS
WITH full_only AS (
  SELECT reading_id, patient_id, event_time, glucose_mmol_l
  FROM dcp_synth.`01_bronze`.cgm_readings
  EXCEPT
  SELECT reading_id, patient_id, event_time, glucose_mmol_l
  FROM dcp_synth.`01_bronze_incremental`.cgm_readings_incremental
),
incremental_only AS (
  SELECT reading_id, patient_id, event_time, glucose_mmol_l
  FROM dcp_synth.`01_bronze_incremental`.cgm_readings_incremental
  EXCEPT
  SELECT reading_id, patient_id, event_time, glucose_mmol_l
  FROM dcp_synth.`01_bronze`.cgm_readings
)
SELECT 'FULL_ONLY' AS difference_type, count(*) AS difference_count FROM full_only
UNION ALL
SELECT 'INCREMENTAL_ONLY', count(*) FROM incremental_only;
