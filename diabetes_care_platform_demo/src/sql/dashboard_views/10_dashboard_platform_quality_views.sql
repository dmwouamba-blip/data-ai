USE CATALOG dcp_synth; 

CREATE OR REPLACE VIEW `04_presentation`.vw_source_operations AS SELECT source_id,source_name,domain,format_protocol,cadence,target_table,classification,owner_role,implementation_status FROM `00_config`.source_catalog; 

CREATE OR REPLACE VIEW `04_presentation`.vw_clinical_glucose_daily AS SELECT s.patient_id,p.diabetes_type,p.therapy_profile,p.country,s.measure_date,s.mean_glucose_mmol_l,s.tir_pct,s.tbr_pct,s.tar_pct,s.reading_count,s.refreshed_at FROM `03_gold`.dp02_patient_glucose_summary s JOIN `02_silver`.patient p USING(patient_id); CREATE OR REPLACE VIEW `04_presentation`.vw_device_operations AS SELECT patient_id,device_id,event_time,battery_pct,sync_status,error_code,ingested_at FROM `03_gold`.dp09_patient_device_status;