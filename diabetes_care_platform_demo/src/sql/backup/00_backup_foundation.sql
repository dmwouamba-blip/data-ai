-- ============================================================
-- DCP BACKUP FOUNDATION
-- File: src/sql/backup/00_backup_foundation.sql
-- ============================================================
-- Purpose:
--   Create the backup control plane and deterministically recreate
--   the named CHECK constraints on every execution.
--
-- Execution order inside this file:
--   1. Catalog and schemas
--   2. Registry/configuration/audit tables
--   3. DROP CHECK constraints IF EXISTS
--   4. ADD CHECK constraints
--   5. Foundation/domain validation queries
--
-- Notes:
--   * CHECK constraints are created with ALTER TABLE.
--   * Existing rows are validated when a CHECK constraint is added.
--   * DROP CONSTRAINT IF EXISTS makes the named CHECK-constraint
--     portion safely repeatable with respect to constraint existence.
--   * The informational primary key is declared at table creation and
--     is intentionally not dropped/recreated here.
-- ============================================================

-- ============================================================
-- 1. BACKUP CATALOG
-- ============================================================

CREATE CATALOG IF NOT EXISTS dcp_synth_backup
COMMENT 'Control plane and physical recovery copies for guarded lakehouse refreshes';


-- ============================================================
-- 2. BACKUP SCHEMAS
-- ============================================================

CREATE SCHEMA IF NOT EXISTS dcp_synth_backup.admin
COMMENT 'Backup registry, configuration, execution evidence, and monitoring metadata';

CREATE SCHEMA IF NOT EXISTS dcp_synth_backup.bronze
COMMENT 'Physical Bronze recovery copies';

CREATE SCHEMA IF NOT EXISTS dcp_synth_backup.silver
COMMENT 'Physical Silver recovery copies';

CREATE SCHEMA IF NOT EXISTS dcp_synth_backup.gold
COMMENT 'Physical Gold recovery copies';


-- ============================================================
-- 3. BACKUP SET REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS dcp_synth_backup.admin.backup_sets (
  backup_set_id       STRING      NOT NULL COMMENT 'Unique immutable identifier for one backup execution',
  environment         STRING      NOT NULL COMMENT 'Deployment target such as dev, test, or prod',
  refresh_type        STRING      NOT NULL COMMENT 'Refresh category protected by this backup',
  requested_by        STRING               COMMENT 'Identity requesting or executing the guarded refresh',
  request_reason      STRING               COMMENT 'Optional operational reason or change reference',
  started_at          TIMESTAMP   NOT NULL COMMENT 'Backup execution start timestamp',
  completed_at        TIMESTAMP            COMMENT 'Backup validation completion timestamp',
  validation_status   STRING      NOT NULL COMMENT 'PENDING, VALIDATED, or FAILED',
  refresh_status      STRING      NOT NULL COMMENT 'PENDING, READY_FOR_REFRESH, RUNNING, VALIDATING, SUCCESS, or FAILED',
  retention_status    STRING      NOT NULL COMMENT 'ACTIVE, RETAINED, DELETION_PENDING, or DELETED',
  deleted_at          TIMESTAMP            COMMENT 'Timestamp when physical recovery copies were removed',
  error_message       STRING               COMMENT 'Set-level failure information',
  created_at          TIMESTAMP   NOT NULL COMMENT 'Registry creation timestamp',
  updated_at          TIMESTAMP   NOT NULL COMMENT 'Last registry update timestamp',
  CONSTRAINT backup_sets_pk PRIMARY KEY (backup_set_id) NOT ENFORCED
)
USING DELTA
COMMENT 'One governed registry record per guarded backup set';


-- ============================================================
-- 4. BACKUP OBJECT REGISTRY
-- ============================================================

CREATE TABLE IF NOT EXISTS dcp_synth_backup.admin.backup_objects (
  backup_set_id       STRING      NOT NULL COMMENT 'Parent backup-set identifier',
  layer               STRING      NOT NULL COMMENT 'Logical source layer',
  object_type         STRING      NOT NULL COMMENT 'Source relation type such as TABLE, MATERIALIZED_VIEW, or STREAMING_TABLE',
  backup_method       STRING      NOT NULL COMMENT 'Physical protection method',
  source_object       STRING      NOT NULL COMMENT 'Fully qualified protected source relation',
  backup_object       STRING      NOT NULL COMMENT 'Fully qualified physical recovery relation',
  source_row_count    BIGINT               COMMENT 'Source count captured immediately before refresh',
  backup_row_count    BIGINT               COMMENT 'Backup count captured after physical protection',
  source_schema_json  STRING               COMMENT 'Spark StructType JSON captured before refresh',
  backup_schema_json  STRING               COMMENT 'Spark StructType JSON captured from recovery copy',
  validation_status   STRING      NOT NULL COMMENT 'PENDING, VALIDATED, or FAILED',
  completed_at        TIMESTAMP            COMMENT 'Object backup validation completion timestamp',
  error_details       STRING               COMMENT 'Object-level error or validation failure',
  created_at          TIMESTAMP   NOT NULL COMMENT 'Registry creation timestamp',
  updated_at          TIMESTAMP   NOT NULL COMMENT 'Last registry update timestamp'
)
USING DELTA
COMMENT 'Object-level inventory and validation evidence for each backup set';


-- ============================================================
-- 5. BACKUP OBJECT CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS dcp_synth_backup.admin.backup_object_config (
  layer                    STRING    NOT NULL COMMENT 'Logical layer of the protected source object',
  source_object            STRING    NOT NULL COMMENT 'Fully qualified source relation',
  enabled                  BOOLEAN   NOT NULL COMMENT 'Whether the object participates in guarded backups',
  owner_group              STRING             COMMENT 'Accountable operational or data-product group',
  criticality              STRING    NOT NULL COMMENT 'CRITICAL, IMPORTANT, or OPTIONAL',
  preferred_backup_method  STRING    NOT NULL COMMENT 'DEEP_CLONE or CTAS_SNAPSHOT',
  created_at               TIMESTAMP NOT NULL COMMENT 'Configuration creation timestamp',
  updated_at               TIMESTAMP NOT NULL COMMENT 'Configuration update timestamp'
)
USING DELTA
COMMENT 'Metadata-driven protected-object inventory for guarded backups';


-- ============================================================
-- 6. EXECUTION AUDIT LOG
-- ============================================================

CREATE TABLE IF NOT EXISTS dcp_synth_backup.admin.backup_execution_log (
  execution_id   STRING    NOT NULL COMMENT 'Unique audit-event identifier',
  backup_set_id  STRING             COMMENT 'Related backup-set identifier when available',
  step_name      STRING    NOT NULL COMMENT 'Logical workflow step',
  status         STRING    NOT NULL COMMENT 'Operational status reported by the step',
  message        STRING             COMMENT 'Human-readable operational evidence',
  executed_at    TIMESTAMP NOT NULL COMMENT 'Audit event timestamp'
)
USING DELTA
COMMENT 'Append-only execution evidence for backup, validation, retention, and recovery operations';


-- ============================================================
-- 7. DROP NAMED CHECK CONSTRAINTS IF THEY ALREADY EXIST
-- ============================================================

ALTER TABLE dcp_synth_backup.admin.backup_sets
DROP CONSTRAINT IF EXISTS backup_sets_validation_status_chk;

ALTER TABLE dcp_synth_backup.admin.backup_sets
DROP CONSTRAINT IF EXISTS backup_sets_refresh_status_chk;

ALTER TABLE dcp_synth_backup.admin.backup_sets
DROP CONSTRAINT IF EXISTS backup_sets_retention_status_chk;

ALTER TABLE dcp_synth_backup.admin.backup_objects
DROP CONSTRAINT IF EXISTS backup_objects_validation_status_chk;

ALTER TABLE dcp_synth_backup.admin.backup_objects
DROP CONSTRAINT IF EXISTS backup_objects_backup_method_chk;

ALTER TABLE dcp_synth_backup.admin.backup_object_config
DROP CONSTRAINT IF EXISTS backup_object_config_criticality_chk;

ALTER TABLE dcp_synth_backup.admin.backup_object_config
DROP CONSTRAINT IF EXISTS backup_object_config_method_chk;

ALTER TABLE dcp_synth_backup.admin.backup_execution_log
DROP CONSTRAINT IF EXISTS backup_execution_log_status_chk;


-- ============================================================
-- 8. RECREATE ENFORCED CHECK CONSTRAINTS
-- ============================================================

ALTER TABLE dcp_synth_backup.admin.backup_sets
ADD CONSTRAINT backup_sets_validation_status_chk
CHECK (
  validation_status IN ('PENDING', 'VALIDATED', 'FAILED')
);

ALTER TABLE dcp_synth_backup.admin.backup_sets
ADD CONSTRAINT backup_sets_refresh_status_chk
CHECK (
  refresh_status IN (
    'PENDING',
    'READY_FOR_REFRESH',
    'RUNNING',
    'VALIDATING',
    'SUCCESS',
    'FAILED'
  )
);

ALTER TABLE dcp_synth_backup.admin.backup_sets
ADD CONSTRAINT backup_sets_retention_status_chk
CHECK (
  retention_status IN (
    'ACTIVE',
    'RETAINED',
    'DELETION_PENDING',
    'DELETED'
  )
);

ALTER TABLE dcp_synth_backup.admin.backup_objects
ADD CONSTRAINT backup_objects_validation_status_chk
CHECK (
  validation_status IN ('PENDING', 'VALIDATED', 'FAILED')
);

ALTER TABLE dcp_synth_backup.admin.backup_objects
ADD CONSTRAINT backup_objects_backup_method_chk
CHECK (
  backup_method IN ('DEEP_CLONE', 'CTAS_SNAPSHOT')
);

ALTER TABLE dcp_synth_backup.admin.backup_object_config
ADD CONSTRAINT backup_object_config_criticality_chk
CHECK (
  criticality IN ('CRITICAL', 'IMPORTANT', 'OPTIONAL')
);

ALTER TABLE dcp_synth_backup.admin.backup_object_config
ADD CONSTRAINT backup_object_config_method_chk
CHECK (
  preferred_backup_method IN ('DEEP_CLONE', 'CTAS_SNAPSHOT')
);

ALTER TABLE dcp_synth_backup.admin.backup_execution_log
ADD CONSTRAINT backup_execution_log_status_chk
CHECK (
  status IN (
    'STARTED',
    'SUCCEEDED',
    'FAILED',
    'SKIPPED',
    'DRY_RUN',
    'OBJECT_DELETED'
  )
);


-- ============================================================
-- 9. FOUNDATION INVENTORY VALIDATION
-- ============================================================

SELECT 'backup_sets' AS object_name, COUNT(*) AS row_count
FROM dcp_synth_backup.admin.backup_sets;

SELECT 'backup_objects' AS object_name, COUNT(*) AS row_count
FROM dcp_synth_backup.admin.backup_objects;

SELECT 'backup_object_config' AS object_name, COUNT(*) AS row_count
FROM dcp_synth_backup.admin.backup_object_config;

SELECT 'backup_execution_log' AS object_name, COUNT(*) AS row_count
FROM dcp_synth_backup.admin.backup_execution_log;


-- ============================================================
-- 10. DOMAIN VALIDATION
-- Every query below should return zero rows.
-- ============================================================

SELECT validation_status, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_sets
WHERE validation_status NOT IN ('PENDING', 'VALIDATED', 'FAILED')
GROUP BY validation_status;

SELECT refresh_status, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_sets
WHERE refresh_status NOT IN (
  'PENDING',
  'READY_FOR_REFRESH',
  'RUNNING',
  'VALIDATING',
  'SUCCESS',
  'FAILED'
)
GROUP BY refresh_status;

SELECT retention_status, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_sets
WHERE retention_status NOT IN (
  'ACTIVE',
  'RETAINED',
  'DELETION_PENDING',
  'DELETED'
)
GROUP BY retention_status;

SELECT validation_status, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_objects
WHERE validation_status NOT IN ('PENDING', 'VALIDATED', 'FAILED')
GROUP BY validation_status;

SELECT backup_method, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_objects
WHERE backup_method NOT IN ('DEEP_CLONE', 'CTAS_SNAPSHOT')
GROUP BY backup_method;

SELECT criticality, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_object_config
WHERE criticality NOT IN ('CRITICAL', 'IMPORTANT', 'OPTIONAL')
GROUP BY criticality;

SELECT preferred_backup_method, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_object_config
WHERE preferred_backup_method NOT IN ('DEEP_CLONE', 'CTAS_SNAPSHOT')
GROUP BY preferred_backup_method;

SELECT status, COUNT(*) AS invalid_rows
FROM dcp_synth_backup.admin.backup_execution_log
WHERE status NOT IN (
  'STARTED',
  'SUCCEEDED',
  'FAILED',
  'SKIPPED',
  'DRY_RUN',
  'OBJECT_DELETED'
)
GROUP BY status;

-- ============================================================
-- END OF DCP BACKUP FOUNDATION
-- ============================================================
