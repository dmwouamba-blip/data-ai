-- Run after full and incremental paths cover the same source horizon.
CREATE OR REPLACE VIEW dcp_synth.`09_test`.v_cgm_full_incremental_difference AS
SELECT * FROM (
  SELECT reading_id,patient_id,event_time,glucose_mmol_l FROM dcp_synth.`01_bronze`.cgm_readings
  EXCEPT SELECT reading_id,patient_id,event_time,glucose_mmol_l FROM dcp_synth.`01_bronze_incremental`.cgm_readings_incremental
  UNION ALL
  SELECT reading_id,patient_id,event_time,glucose_mmol_l FROM dcp_synth.`01_bronze_incremental`.cgm_readings_incremental
  EXCEPT SELECT reading_id,patient_id,event_time,glucose_mmol_l FROM dcp_synth.`01_bronze`.cgm_readings
);
