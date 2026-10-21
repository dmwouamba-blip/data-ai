# DCP Deployment Runbook

## Purpose

Deploy and validate the Diabetes Care Platform in controlled gates:

```text
Full Refresh baseline
        ↓
Backup Foundation
        ↓
Backup Test Suite
        ↓
Guarded Full Refresh + Recovery Point
        ↓
Incremental Foundation
        ↓
Incremental Deployment
        ↓
Incremental Test Suite
        ↓
Reconciliation
        ↓
Git Review → Commit → Push → PR
```

**Rule:** Do not proceed to the next gate when the current gate fails.

---

## 0. Assumptions and working directory

Target used in this runbook:

```text
dev
```

Repository root:

```bash
cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo
```

Always run Bundle commands from the repository root.

Expected backup artifacts:

```text
src/sql/backup/
├── 00_backup_foundation.sql
├── 01_backup_object_config.sql
└── 02_backup_views.sql

src/notebooks/backup/
├── create_validate_backup.py
├── validate_full_refresh.py
└── apply_retention.py

resources/
└── dcp_backup_foundation.yml
```

---

# Phase 1: Preflight and Bundle validation

## 1.1 Verify working tree

```bash
git status
```

Review changes:

```bash
git diff
```

## 1.2 Verify critical files

```bash
find src/sql/backup -maxdepth 1 -type f -print
find src/notebooks/backup -maxdepth 1 -type f -print
```

The Python notebooks must be Databricks source notebooks. Check headers:

```bash
head -1 src/notebooks/backup/create_validate_backup.py
head -1 src/notebooks/backup/validate_full_refresh.py
head -1 src/notebooks/backup/apply_retention.py
```

Expected first line:

```python
# Databricks notebook source
```

## 1.3 Validate Bundle

```bash
databricks bundle validate -t dev
```

**Gate:** Continue only with zero validation errors.

## 1.4 Inspect resolved resources

```bash
databricks bundle summary -t dev
```

Inspect:

- target is `dev`
- expected workspace host
- expected deployment root
- Full Refresh resources
- `dcp_backup_foundation`
- `dcp_backup_notebook_test_suite`
- `dcp_backup_and_full_refresh`
- incremental jobs and pipelines

---

# Phase 2: Bundle deployment

Deploy the resolved DEV resources:

```bash
databricks bundle deploy -t dev
```

Then verify:

```bash
databricks bundle summary -t dev
```

`not deployed` should no longer appear for resources intended to be deployed by this Bundle revision.

**Note:** Deployment is not equivalent to a successful execution or test.

---

# Phase 3: Full Refresh baseline

The goal is to prove that the existing Full Refresh path works before testing backup or incremental behavior.

## 3.1 Run Full Refresh baseline

```bash
databricks bundle run dcp_lakeflow_deployment -t dev
```

**Gate:** The job must complete successfully.

## 3.2 Inspect target layers

```sql
SHOW TABLES IN dcp_synth.`01_bronze`;
SHOW TABLES IN dcp_synth.`02_silver`;
SHOW TABLES IN dcp_synth.`03_gold`;
SHOW TABLES IN dcp_synth.`04_marketplace`;
```

Use the platform's existing validation task/test outputs as the authoritative Full Refresh acceptance evidence.

**Do not run the incremental deployment yet.**

---

# Phase 4: Backup Foundation

The Backup Foundation is automated through:

```text
dcp_backup_foundation
```

Task order:

```text
00_backup_foundation.sql
        ↓
01_backup_object_config.sql
        ↓
02_backup_views.sql
```

## 4.1 Optional clean DEV reset

Use this only when intentionally discarding the DEV backup control plane and all recovery/audit state inside it:

```sql
DROP CATALOG IF EXISTS dcp_synth_backup CASCADE;
```

**Never treat this as a routine production deployment step.**

## 4.2 Run Backup Foundation

```bash
databricks bundle run dcp_backup_foundation -t dev
```

Expected task sequence:

```text
backup_foundation
       ↓
backup_object_config
       ↓
backup_views
       ↓
SUCCESS
```

## 4.3 Verify administration tables

```sql
SHOW TABLES IN dcp_synth_backup.admin;
```

Expected foundation tables include:

```text
backup_sets
backup_objects
backup_object_config
backup_execution_log
```

## 4.4 Verify protected-object configuration

```sql
SELECT
    layer,
    source_object,
    enabled,
    owner_group,
    criticality,
    preferred_backup_method
FROM dcp_synth_backup.admin.backup_object_config
ORDER BY layer, source_object;
```

Confirm every enabled `source_object` corresponds to a real DEV relation before running the guarded backup workflow.

## 4.5 Verify monitoring views

```sql
SHOW VIEWS IN dcp_synth_backup.admin;
```

Useful views include:

```text
v_backup_summary
v_backup_validation_failures
v_latest_recovery_point
v_recovery_inventory
v_retention_candidates
v_active_backup_sets
v_backup_health
v_backup_governance
v_recovery_coverage
v_backup_execution_audit
v_backup_execution_failures
v_latest_backup_set
v_backup_object_reconciliation
v_critical_protection_gaps
```

## 4.6 Important schema convention

```text
backup_sets.error_message
    = set/workflow-level failure

backup_objects.error_details
    = object-level failure
```

Do not use `backup_objects.error_message`.

---

# Phase 5: Backup Test Suite

Run:

```bash
databricks bundle run dcp_backup_notebook_test_suite -t dev
```

**Gate:** Continue only when the complete suite succeeds.

Review failures before moving to the guarded Full Refresh.

Useful operational queries:

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_health;
```

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_validation_failures;
```

```sql
SELECT *
FROM dcp_synth_backup.admin.v_critical_protection_gaps;
```

---

# Phase 6: Guarded Full Refresh

After the Backup Foundation and Backup Test Suite are green, run:

```bash
databricks bundle run dcp_backup_and_full_refresh -t dev
```

Conceptual gate:

```text
create_validate_backup
        ↓
validated recovery point
        ↓
Full Refresh
        ↓
validate_full_refresh
        ↓
apply_retention
```

**Gate:** The complete workflow must succeed.

## 6.1 Verify latest recovery point

```sql
SELECT *
FROM dcp_synth_backup.admin.v_latest_recovery_point;
```

## 6.2 Verify recovery inventory

```sql
SELECT *
FROM dcp_synth_backup.admin.v_recovery_inventory
ORDER BY layer, source_object;
```

## 6.3 Verify reconciliation

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_object_reconciliation
ORDER BY backup_set_id DESC, layer, source_object;
```

Investigate any `MISMATCH` before proceeding.

## 6.4 Verify audit failures

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_execution_failures
ORDER BY executed_at DESC;
```

---

# Phase 7: Incremental Foundation

Only begin Incremental after Full Refresh and Backup/Recovery are proven.

```bash
databricks bundle run dcp_incremental_foundation -t dev
```

**Gate:** Foundation job must succeed.

---

# Phase 8: Incremental Deployment

Run:

```bash
databricks bundle run dcp_incremental_deployment -t dev
```

**Gate:** The complete incremental workflow must succeed.

## 8.1 Inspect generator runs

```sql
SELECT *
FROM dcp_synth.`00_config`.generator_runs
ORDER BY started_at DESC;
```

Confirm the latest run status and timestamps match the execution you just started.

## 8.2 Inspect manifest

```sql
SELECT *
FROM dcp_synth.`00_config`.generator_manifest
ORDER BY generated_at DESC;
```

Validate the manifest against the expected contract for the current generator implementation rather than relying on an undocumented hard-coded row count.

---

# Phase 9: Incremental Test Suite

Run:

```bash
databricks bundle run dcp_incremental_test_suite -t dev
```

The suite should be the acceptance gate for implemented incremental contracts, Bronze/Silver/Gold behavior, registry behavior, and no-data/idempotency behavior where present in the deployed suite.

**Gate:** Do not continue to Git if this suite fails.

---

# Phase 10: Full-vs-Incremental Reconciliation

Run the reconciliation view used by the project:

```sql
SELECT *
FROM dcp_synth.`09_test`.v_incremental_full_cgm_reconciliation;
```

Review the reconciliation result against the project's defined acceptance criteria.

Think of reconciliation as the final data-path gate:

```text
Full Refresh result
        ↕
Reconciliation
        ↕
Incremental result
```

**Gate:** Reconciliation must meet the project's acceptance criteria before commit/push.

---

# Phase 11: Final deployment evidence

Capture evidence for the Pull Request:

```text
[ ] Bundle validation passed
[ ] Bundle deployment passed
[ ] Full Refresh baseline passed
[ ] Backup Foundation passed
[ ] Backup Test Suite passed
[ ] Guarded Full Refresh passed
[ ] Validated recovery point exists
[ ] Incremental Foundation passed
[ ] Incremental Deployment passed
[ ] Incremental Test Suite passed
[ ] Reconciliation passed
[ ] No unresolved critical protection gaps
[ ] git diff reviewed
```

Useful final checks:

```bash
databricks bundle validate -t dev
```

```bash
databricks bundle summary -t dev
```

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_health;
```

```sql
SELECT *
FROM dcp_synth_backup.admin.v_latest_recovery_point;
```

---

# Phase 12: Git review, commit, push

Only perform this phase after all previous gates are green.

## 12.1 Status

```bash
git status
```

## 12.2 Review changes

```bash
git diff
```

Also review staged output before committing:

```bash
git diff --cached
```

## 12.3 Stage

```bash
git add .
```

Review again:

```bash
git status
git diff --cached
```

## 12.4 Commit

Example:

```bash
git commit -m "Add guarded backup and incremental lakehouse architecture"
```

## 12.5 Push

Push the current feature branch:

```bash
git push origin <feature-branch>
```

Do not substitute `main` unless direct pushes to `main` are explicitly part of your repository policy.

## 12.6 Pull Request evidence

Include:

```text
Bundle validation
Full Refresh run
Backup Foundation run
Backup Test Suite
Guarded Full Refresh run
Recovery-point evidence
Incremental Foundation
Incremental Deployment
Incremental Test Suite
Reconciliation evidence
```

---

# Failure handling

## Bundle validation fails

Stop. Fix the referenced source/resource path or configuration, then rerun:

```bash
databricks bundle validate -t dev
```

## Backup Foundation fails

Stop before Backup Test Suite.

Check which task failed:

```text
backup_foundation
backup_object_config
backup_views
```

Typical schema-contract issues already identified during DEV bootstrap:

```text
backup_sets.error_message      valid
backup_objects.error_details   valid
backup_objects.error_message   obsolete/invalid
```

## Backup Test Suite fails

Do not run guarded Full Refresh until the failure is understood and fixed.

## Guarded Full Refresh fails

Do not start Incremental. Inspect:

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_execution_failures
ORDER BY executed_at DESC;
```

and:

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_validation_failures;
```

## Incremental run fails

Do not commit/push. Inspect the failed job/pipeline task and generator/manifest evidence before rerunning.

## Reconciliation fails

Treat it as a release blocker until the mismatch is explained or corrected.

---

# DEV clean-reset rule

A DEV-only destructive reset of the backup control plane is:

```sql
DROP CATALOG IF EXISTS dcp_synth_backup CASCADE;
```

This removes the backup catalog and its contained recovery/control-plane state. Use only when that loss is explicitly intended.

Normal reruns should instead use:

```bash
databricks bundle run dcp_backup_foundation -t dev
```

The current foundation creates catalog/schemas/tables with `IF NOT EXISTS` and recreates its named CHECK constraints using the pattern:

```sql
ALTER TABLE ... DROP CONSTRAINT IF EXISTS ...;
ALTER TABLE ... ADD CONSTRAINT ... CHECK (...);
```

A normal foundation rerun is not a general schema-migration mechanism. If a future release changes table columns, create and review an explicit migration rather than assuming `CREATE TABLE IF NOT EXISTS` will modify an existing schema.

---

# Compact command sequence

```bash
cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo

# Preflight
git status
databricks bundle validate -t dev
databricks bundle summary -t dev

# Deploy resources
databricks bundle deploy -t dev

# Full Refresh baseline
databricks bundle run dcp_lakeflow_deployment -t dev

# Backup
databricks bundle run dcp_backup_foundation -t dev
databricks bundle run dcp_backup_notebook_test_suite -t dev
databricks bundle run dcp_backup_and_full_refresh -t dev

# Incremental
databricks bundle run dcp_incremental_foundation -t dev
databricks bundle run dcp_incremental_deployment -t dev
databricks bundle run dcp_incremental_test_suite -t dev

# Final review
git status
git diff
git add .
git diff --cached
git commit -m "Add guarded backup and incremental lakehouse architecture"
git push origin <feature-branch>
```

---

# Definition of Done

The DEV deployment is ready for PR/promotion consideration only when:

```text
Bundle configuration resolves successfully
        +
Full Refresh baseline succeeds
        +
Backup Foundation succeeds
        +
Backup tests succeed
        +
Guarded Full Refresh succeeds
        +
Validated recovery point exists
        +
Incremental Foundation succeeds
        +
Incremental deployment succeeds
        +
Incremental tests succeed
        +
Reconciliation meets acceptance criteria
        +
Git diff is reviewed
```

Then and only then:

```text
Commit → Push → Pull Request
```
