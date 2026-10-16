-- ============================================================
-- DCP Backup Monitoring Views
-- Version: 2.1
-- ============================================================
--
-- Purpose:
--   Monitoring
--   Recovery
--   Retention
--   Governance
--   Audit reporting
--
-- Expected foundation:
--
--   dcp_synth_backup.admin.backup_sets
--   dcp_synth_backup.admin.backup_objects
--   dcp_synth_backup.admin.backup_object_config
--   dcp_synth_backup.admin.backup_execution_log
--
-- Error-column convention:
--
--   backup_sets.error_message
--       Set/workflow-level error
--
--   backup_objects.error_details
--       Individual object-level error
--
-- ============================================================


-- ============================================================
-- 1. BACKUP SUMMARY
-- ============================================================
--
-- One row per backup set.
--
-- Provides:
--   - execution timestamps
--   - duration
--   - number of protected objects
--   - object validation counts
--   - backup-set lifecycle status
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_summary
AS

SELECT
    s.backup_set_id,

    s.environment,

    s.refresh_type,

    s.requested_by,

    s.request_reason,

    s.started_at,

    s.completed_at,

    CASE
        WHEN s.completed_at IS NOT NULL
        THEN
            unix_timestamp(s.completed_at)
            -
            unix_timestamp(s.started_at)

        ELSE NULL
    END AS duration_seconds,

    COUNT(o.source_object)
        AS object_count,

    COUNT_IF(
        o.validation_status = 'VALIDATED'
    ) AS validated_objects,

    COUNT_IF(
        o.validation_status = 'FAILED'
    ) AS failed_objects,

    s.validation_status,

    s.refresh_status,

    s.retention_status,

    s.error_message

FROM
    dcp_synth_backup.admin.backup_sets s

LEFT JOIN
    dcp_synth_backup.admin.backup_objects o

ON
    s.backup_set_id = o.backup_set_id

GROUP BY
    s.backup_set_id,
    s.environment,
    s.refresh_type,
    s.requested_by,
    s.request_reason,
    s.started_at,
    s.completed_at,
    s.validation_status,
    s.refresh_status,
    s.retention_status,
    s.error_message;


-- ============================================================
-- 2. BACKUP VALIDATION FAILURES
-- ============================================================
--
-- Object-level validation failures.
--
-- IMPORTANT:
-- backup_objects uses error_details, not error_message.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_validation_failures
AS

SELECT
    backup_set_id,

    layer,

    object_type,

    backup_method,

    source_object,

    backup_object,

    source_row_count,

    backup_row_count,

    validation_status,

    error_details,

    completed_at,

    updated_at

FROM
    dcp_synth_backup.admin.backup_objects

WHERE
    validation_status <> 'VALIDATED';


-- ============================================================
-- 3. LATEST RECOVERY POINT
-- ============================================================
--
-- Returns the latest validated, non-deleted recovery point
-- per environment.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_latest_recovery_point
AS

WITH ranked AS
(
    SELECT
        backup_set_id,

        environment,

        refresh_type,

        requested_by,

        request_reason,

        started_at,

        completed_at,

        validation_status,

        refresh_status,

        retention_status,

        deleted_at,

        error_message,

        created_at,

        updated_at,

        ROW_NUMBER()
        OVER
        (
            PARTITION BY environment

            ORDER BY
                completed_at DESC,
                backup_set_id DESC
        ) AS recovery_rank

    FROM
        dcp_synth_backup.admin.backup_sets

    WHERE
        validation_status = 'VALIDATED'

    AND
        COALESCE(
            retention_status,
            'ACTIVE'
        ) <> 'DELETED'
)

SELECT
    *

FROM
    ranked

WHERE
    recovery_rank = 1;


-- ============================================================
-- 4. RECOVERY INVENTORY
-- ============================================================
--
-- Lists physical recovery objects belonging to validated
-- backup sets.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_recovery_inventory
AS

SELECT
    s.backup_set_id,

    s.environment,

    s.refresh_type,

    s.started_at,

    s.completed_at,

    s.retention_status,

    o.layer,

    o.object_type,

    o.backup_method,

    o.source_object,

    o.backup_object,

    o.source_row_count,

    o.backup_row_count,

    o.validation_status AS object_validation_status,

    o.completed_at AS object_completed_at,

    o.error_details

FROM
    dcp_synth_backup.admin.backup_sets s

INNER JOIN
    dcp_synth_backup.admin.backup_objects o

ON
    s.backup_set_id = o.backup_set_id

WHERE
    s.validation_status = 'VALIDATED'

AND
    o.validation_status = 'VALIDATED'

AND
    COALESCE(
        s.retention_status,
        'ACTIVE'
    ) <> 'DELETED';


-- ============================================================
-- 5. RETENTION CANDIDATES
-- ============================================================
--
-- Identifies validated recovery points that are older than
-- the newest two recovery points for each environment.
--
-- IMPORTANT:
-- This is a monitoring/planning view.
-- It does NOT delete anything.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_retention_candidates
AS

WITH ranked AS
(
    SELECT
        backup_set_id,

        environment,

        refresh_type,

        requested_by,

        started_at,

        completed_at,

        validation_status,

        refresh_status,

        retention_status,

        created_at,

        updated_at,

        ROW_NUMBER()
        OVER
        (
            PARTITION BY environment

            ORDER BY
                completed_at DESC,
                backup_set_id DESC
        ) AS retention_rank

    FROM
        dcp_synth_backup.admin.backup_sets

    WHERE
        validation_status = 'VALIDATED'

    AND
        refresh_status = 'SUCCESS'

    AND
        COALESCE(
            retention_status,
            'ACTIVE'
        ) <> 'DELETED'
)

SELECT
    *

FROM
    ranked

WHERE
    retention_rank > 2;


-- ============================================================
-- 6. ACTIVE BACKUP SETS
-- ============================================================
--
-- Validated backup sets that still represent available
-- recovery points.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_active_backup_sets
AS

SELECT
    backup_set_id,

    environment,

    refresh_type,

    requested_by,

    request_reason,

    started_at,

    completed_at,

    validation_status,

    refresh_status,

    retention_status,

    created_at,

    updated_at

FROM
    dcp_synth_backup.admin.backup_sets

WHERE
    validation_status = 'VALIDATED'

AND
    COALESCE(
        retention_status,
        'ACTIVE'
    ) <> 'DELETED';


-- ============================================================
-- 7. BACKUP HEALTH
-- ============================================================
--
-- Aggregate health view of the backup-set registry.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_health
AS

SELECT
    COUNT(*)
        AS total_backup_sets,

    COUNT_IF(
        validation_status = 'VALIDATED'
    ) AS validated_sets,

    COUNT_IF(
        validation_status = 'FAILED'
    ) AS failed_sets,

    COUNT_IF(
        validation_status = 'PENDING'
    ) AS pending_sets,

    COUNT_IF(
        refresh_status = 'SUCCESS'
    ) AS successful_refreshes,

    COUNT_IF(
        refresh_status = 'FAILED'
    ) AS failed_refreshes,

    COUNT_IF(
        refresh_status = 'VALIDATING'
    ) AS validating_refreshes,

    COUNT_IF(
        COALESCE(
            retention_status,
            'ACTIVE'
        ) = 'ACTIVE'
    ) AS active_sets,

    COUNT_IF(
        retention_status = 'RETAINED'
    ) AS retained_sets,

    COUNT_IF(
        retention_status = 'DELETION_PENDING'
    ) AS deletion_pending_sets,

    COUNT_IF(
        retention_status = 'DELETED'
    ) AS deleted_sets,

    MAX(completed_at)
        AS latest_completed_backup_at

FROM
    dcp_synth_backup.admin.backup_sets;


-- ============================================================
-- 8. GOVERNANCE OVERVIEW
-- ============================================================
--
-- Shows the configured protection policy.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_governance
AS

SELECT
    c.layer,

    c.source_object,

    c.owner_group,

    c.criticality,

    c.preferred_backup_method,

    c.enabled,

    c.created_at,

    c.updated_at

FROM
    dcp_synth_backup.admin.backup_object_config c;


-- ============================================================
-- 9. RECOVERY COVERAGE
-- ============================================================
--
-- Answers:
--
-- "Does every enabled configured source currently have at
--  least one validated physical recovery copy?"
--
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_recovery_coverage
AS

WITH validated_objects AS
(
    SELECT DISTINCT
        o.source_object

    FROM
        dcp_synth_backup.admin.backup_objects o

    INNER JOIN
        dcp_synth_backup.admin.backup_sets s

    ON
        o.backup_set_id = s.backup_set_id

    WHERE
        o.validation_status = 'VALIDATED'

    AND
        s.validation_status = 'VALIDATED'

    AND
        COALESCE(
            s.retention_status,
            'ACTIVE'
        ) <> 'DELETED'
)

SELECT
    c.layer,

    c.source_object,

    c.owner_group,

    c.criticality,

    c.preferred_backup_method,

    CASE
        WHEN o.source_object IS NOT NULL
        THEN 'PROTECTED'

        ELSE 'NOT_PROTECTED'
    END AS protection_status

FROM
    dcp_synth_backup.admin.backup_object_config c

LEFT JOIN
    validated_objects o

ON
    c.source_object = o.source_object

WHERE
    c.enabled = true;


-- ============================================================
-- 10. EXECUTION AUDIT
-- ============================================================
--
-- Convenience view over append-only operational evidence.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_execution_audit
AS

SELECT
    execution_id,

    backup_set_id,

    step_name,

    status,

    message,

    executed_at

FROM
    dcp_synth_backup.admin.backup_execution_log;


-- ============================================================
-- 11. FAILED EXECUTION EVENTS
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_execution_failures
AS

SELECT
    execution_id,

    backup_set_id,

    step_name,

    status,

    message,

    executed_at

FROM
    dcp_synth_backup.admin.backup_execution_log

WHERE
    status = 'FAILED';


-- ============================================================
-- 12. LATEST BACKUP SET PER ENVIRONMENT
-- ============================================================
--
-- Latest set regardless of whether validation ultimately
-- succeeded. Useful for identifying a newer failed/pending
-- attempt when an older successful recovery point still exists.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_latest_backup_set
AS

WITH ranked AS
(
    SELECT
        backup_set_id,

        environment,

        refresh_type,

        requested_by,

        request_reason,

        started_at,

        completed_at,

        validation_status,

        refresh_status,

        retention_status,

        error_message,

        created_at,

        updated_at,

        ROW_NUMBER()
        OVER
        (
            PARTITION BY environment

            ORDER BY
                started_at DESC,
                backup_set_id DESC
        ) AS backup_rank

    FROM
        dcp_synth_backup.admin.backup_sets
)

SELECT
    *

FROM
    ranked

WHERE
    backup_rank = 1;


-- ============================================================
-- 13. BACKUP OBJECT RECONCILIATION
-- ============================================================
--
-- Helps detect row-count mismatch between the protected
-- source count captured at backup time and its recovery copy.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_backup_object_reconciliation
AS

SELECT
    backup_set_id,

    layer,

    source_object,

    backup_object,

    backup_method,

    source_row_count,

    backup_row_count,

    CASE
        WHEN source_row_count IS NULL
          OR backup_row_count IS NULL
        THEN 'NOT_MEASURED'

        WHEN source_row_count = backup_row_count
        THEN 'MATCH'

        ELSE 'MISMATCH'
    END AS reconciliation_status,

    validation_status,

    error_details,

    completed_at

FROM
    dcp_synth_backup.admin.backup_objects;


-- ============================================================
-- 14. CRITICAL PROTECTION GAPS
-- ============================================================
--
-- Enabled CRITICAL configuration entries without a currently
-- validated recovery copy.
-- ============================================================

CREATE OR REPLACE VIEW
dcp_synth_backup.admin.v_critical_protection_gaps
AS

SELECT
    layer,

    source_object,

    owner_group,

    criticality,

    preferred_backup_method,

    protection_status

FROM
    dcp_synth_backup.admin.v_recovery_coverage

WHERE
    criticality = 'CRITICAL'

AND
    protection_status = 'NOT_PROTECTED';


-- ============================================================
-- END OF DCP BACKUP MONITORING VIEWS
-- ============================================================