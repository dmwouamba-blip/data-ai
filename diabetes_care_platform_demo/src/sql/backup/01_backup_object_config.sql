-- DCP Backup Object Configuration
-- Purpose: register the core protected DCP relations for guarded refresh.
-- The MERGE is idempotent and does not remove configuration rows not listed here.
-- IMPORTANT: run the verification query at the bottom. Disable or correct any object that does not exist in your deployment.

MERGE INTO dcp_synth_backup.admin.backup_object_config AS t
USING (
  SELECT * FROM VALUES
    ('BRONZE', 'dcp_synth.01_bronze.patient_master',                 true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.cgm_readings',                  true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.mysugr_logbook',                true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.consent_events',                true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.consent_propagation',           true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.device_events',                 true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.patient_alerts',                true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),
    ('BRONZE', 'dcp_synth.01_bronze.report_sharing',                true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),

    ('SILVER', 'dcp_synth.02_silver.patient',                       true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('SILVER', 'dcp_synth.02_silver.glucose_readings',              true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('SILVER', 'dcp_synth.02_silver.consent_events',                true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('SILVER', 'dcp_synth.02_silver.device_status',                 true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),

    ('GOLD',   'dcp_synth.03_gold.dp01_patient_glucose_timeline',   true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),
    ('GOLD',   'dcp_synth.03_gold.dp02_patient_glucose_summary',    true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('GOLD',   'dcp_synth.03_gold.dp09_patient_device_status',      true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT'),
    ('GOLD',   'dcp_synth.03_gold.dp10_patient_consent_current',    true, 'data-platform', 'CRITICAL',  'CTAS_SNAPSHOT'),
    ('GOLD',   'dcp_synth.03_gold.dp11_consent_propagation_status', true, 'data-platform', 'IMPORTANT', 'CTAS_SNAPSHOT')
  AS v(layer, source_object, enabled, owner_group, criticality, preferred_backup_method)
) AS s
ON t.source_object = s.source_object
WHEN MATCHED THEN UPDATE SET
  t.layer = s.layer,
  t.enabled = s.enabled,
  t.owner_group = s.owner_group,
  t.criticality = s.criticality,
  t.preferred_backup_method = s.preferred_backup_method,
  t.updated_at = current_timestamp()
WHEN NOT MATCHED THEN INSERT (
  layer, source_object, enabled, owner_group, criticality,
  preferred_backup_method, created_at, updated_at
) VALUES (
  s.layer, s.source_object, s.enabled, s.owner_group, s.criticality,
  s.preferred_backup_method, current_timestamp(), current_timestamp()
);

-- Configuration validation: expected result is zero rows.
SELECT source_object, count(*) AS configured_count
FROM dcp_synth_backup.admin.backup_object_config
WHERE enabled = true
GROUP BY source_object
HAVING count(*) > 1;

-- Operational inventory review. Confirm each enabled source_object actually exists
-- in the deployed DEV platform before executing the guarded backup workflow.
SELECT
  layer,
  source_object,
  criticality,
  preferred_backup_method,
  owner_group
FROM dcp_synth_backup.admin.backup_object_config
WHERE enabled = true
ORDER BY
  CASE layer WHEN 'BRONZE' THEN 1 WHEN 'SILVER' THEN 2 WHEN 'GOLD' THEN 3 ELSE 4 END,
  source_object;
