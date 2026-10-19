-- DEPLOYABLE TEMPLATE | Databricks SQL
-- Regulatory presentation views with upstream schema checks.

USE CATALOG dcp_synth;

CREATE SCHEMA IF NOT EXISTS `04_presentation`;

-- ============================================================
-- Schema check: DP-19 Regulatory Submission Master
-- Required columns: 8
-- ============================================================



SELECT
    column_name,
    data_type,
    ordinal_position
FROM system.information_schema.columns
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '03_gold'
  AND table_name = 'dp19_regulatory_submission_master'
  AND column_name IN (
      'submission_id',
      'product_id',
      'market',
      'authority',
      'workflow_stage',
      'risk_status',
      'owner',
      'authority_due_date',
      'updated_at'
  )
ORDER BY ordinal_position;

SELECT
    CASE
        WHEN COUNT(*) = 9 THEN 'PASS'
        ELSE 'FAIL'
    END AS schema_check,
    COUNT(*) AS required_columns_found
FROM system.information_schema.columns
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '03_gold'
  AND table_name = 'dp19_regulatory_submission_master'
  AND column_name IN (
      'submission_id',
      'product_id',
      'market',
      'authority',
      'workflow_stage',
      'risk_status',
      'owner',
      'authority_due_date',
      'updated_at'
  );


-- ============================================================
-- Schema check: DP-21 Regulatory Authority Interactions
-- Required columns: 8
-- ============================================================


SELECT
    column_name,
    data_type,
    ordinal_position
FROM system.information_schema.columns
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '03_gold'
  AND table_name = 'dp21_regulatory_authority_interactions'
  AND column_name IN (
      'interaction_id',
      'submission_id',
      'product_id',
      'market',
      'authority',
      'interaction_type',
      'response_due_date',
      'status'
  )
ORDER BY ordinal_position;

SELECT
    CASE
        WHEN COUNT(*) = 8 THEN 'PASS'
        ELSE 'FAIL'
    END AS schema_check,
    COUNT(*) AS required_columns_found
FROM system.information_schema.columns
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '03_gold'
  AND table_name = 'dp21_regulatory_authority_interactions'
  AND column_name IN (
      'interaction_id',
      'submission_id',
      'product_id',
      'market',
      'authority',
      'interaction_type',
      'response_due_date',
      'status'
  );


