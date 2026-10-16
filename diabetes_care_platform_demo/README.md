# DCP Synthetic Lakehouse Deployment Bundle

A governed, landing-first Databricks Lakehouse implementation using:

- Databricks Asset Bundles
- Unity Catalog
- Lakeflow Pipelines
- Medallion Architecture
- Synthetic Healthcare Data
- Guarded Full Refresh
- Backup and Recovery Controls
- Data Contracts
- Automated Validation

This package demonstrates healthcare, consent, compliance, regulatory, operational, and dashboard data products using deterministic synthetic datasets.

> **Safety boundary:** This repository contains synthetic healthcare data only. It is intended for demonstrations, proofs of concept, engineering validation, architecture reviews, and training. It is not approved for production healthcare workloads.

---

## Version Information

| Property | Value |
|---|---|
| Platform | DCP Synthetic Lakehouse |
| Version | 2.1 |
| Runtime | Databricks Lakehouse |
| Deployment | Databricks Asset Bundles |
| Architecture | Lakeflow + Medallion |
| Governance | Unity Catalog |
| Data Type | Synthetic Healthcare Data |
| Recovery | Guarded Full Refresh |
| Contracts | Data Contract Architecture |
| Backup Retention | Latest 2 validated backup sets |

---

## Architecture

```text
Synthetic Data Generation
            ↓
Landing Volume
            ↓
Bronze Pipeline
            ↓
Silver Pipeline
            ↓
Gold Pipeline
            ↓
Dashboard Pipeline
            ↓
Quality Views
            ↓
Validation
```

The platform supports two complementary processing paths:

```text
                    Landing Volume
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
      Full Refresh Path        Incremental Target Path
             │                         │
             ▼                         ▼
  Guarded Backup Workflow       Auto Loader Bronze
             │                         │
             ▼                         ▼
 Bronze → Silver → Gold       Silver → Gold Products
```

The existing full-refresh workflow remains available for:

- Rebuilds
- Backfills
- Recovery
- Reconciliation
- Engineering validation

The incremental target architecture is introduced separately to avoid two pipelines writing to the same target objects.

---

## Architecture Diagrams

Detailed architecture diagrams are maintained under:

```text
docs/architecture/
├── DCP_L3_L4_ArchiMate_Enterprise_Architecture.drawio
└── DCP_Data_Contract_Architecture_v2_Detailed.drawio
```

The diagrams document:

- Business and data domains
- Source landscape
- Landing and ingestion architecture
- Medallion data flow
- Full-refresh and incremental paths
- Unity Catalog governance
- Backup and recovery control plane
- Data contracts
- Release and certification gates
- Security boundaries
- Operations and observability
- Consumer and data-product interfaces

---

## Pipeline Architecture

The full-refresh platform is implemented with four Lakeflow Pipelines:

```text
dcp_bronze_pipeline
          ↓
dcp_silver_pipeline
          ↓
dcp_gold_pipeline
          ↓
dcp_dashboard_pipeline_v2
```

### Bronze Pipeline

Creates source-aligned Bronze datasets, including:

```text
01_bronze.patient_master
01_bronze.cgm_readings
01_bronze.mysugr_logbook
01_bronze.device_events
01_bronze.consent_events
01_bronze.consent_propagation
01_bronze.patient_alerts
01_bronze.report_sharing
```

Bronze responsibilities include:

- Source fidelity
- Explicit schemas
- Technical lineage
- Source and run identifiers
- Replay boundaries
- Preservation of synthetic source evidence

### Silver Pipeline

Creates canonical and quality-enriched datasets:

```text
02_silver.patient
02_silver.glucose_readings
02_silver.consent_events
02_silver.consent_propagation
02_silver.device_status
02_silver.patient_alerts
02_silver.report_sharing
02_silver.dashboard_adoption
02_silver.submission_readiness
```

Silver responsibilities include:

- Canonical models
- Type normalization
- Quality status
- Deterministic ordering
- Deduplication
- Consent-state support
- Device-health derivation
- Source-to-target transformation

### Gold Pipeline

Creates governed data products:

```text
DP-01 Patient Glucose Timeline
DP-02 Patient Glucose Summary
DP-09 Patient Device Status
DP-10 Patient Consent Current State
DP-11 Consent Propagation Status
```

Gold responsibilities include:

- Business-level grain
- Governed metrics
- Consumer-ready models
- Aggregations
- Current-state projections
- Data-product publication
- Release validation

### Dashboard Pipeline

Creates presentation and marketplace datasets:

```text
vw_patient_glucose_summary
vw_patient_consent_current
vw_consent_propagation_summary
vw_cio_service_trend
vw_platform_source_health
```

The current Dashboard pipeline resource key is:

```text
dcp_dashboard_pipeline_v2
```

---

## Full-Refresh Workflow

The existing full platform job is:

```text
dcp_lakeflow_deployment
```

Its execution sequence is:

```text
generate_dashboard_data
          ↓
bronze_pipeline
          ↓
silver_pipeline
          ↓
gold_pipeline
          ↓
dashboard_pipeline
          ↓
quality_views
          ↓
validate
```

Once the guarded wrapper is activated, operators should not start this job directly for standard full-refresh operations.

---

## Backup and Recovery Architecture

A guarded full-refresh workflow protects the current platform before executing the existing deployment.

```text
Create Backup Set
          ↓
Validate Backup Objects
          ↓
Mark READY_FOR_REFRESH
          ↓
Run dcp_lakeflow_deployment
          ↓
Validate Refreshed Platform
          ↓
Apply Backup Retention
```

The guarded wrapper job is:

```text
dcp_backup_and_full_refresh
```

### Backup Catalog

The backup control plane uses:

```text
dcp_synth_backup
```

with schemas:

```text
dcp_synth_backup.admin
dcp_synth_backup.bronze
dcp_synth_backup.silver
dcp_synth_backup.gold
```

### Backup Registry

The administration schema contains:

```text
backup_sets
backup_objects
backup_object_config
backup_execution_log
```

### Backup Methods

Supported methods:

```text
DEEP_CLONE
CTAS_SNAPSHOT
```

`DEEP_CLONE` is used for supported Delta tables. Queryable Streaming Tables and Materialized Views are protected using independent CTAS Delta snapshots because they are not eligible for Delta clone operations.

The following definitions remain protected through Git and the Databricks Asset Bundle:

- Lakeflow pipeline definitions
- Streaming Table definitions
- Materialized View definitions
- Job definitions
- Configuration files
- Permissions
- Tags

### Backup Validation

Each backup object is validated using:

- Source availability
- Backup creation success
- Source row count
- Backup row count
- Source and backup schema comparison
- Destination readability
- Object-level status
- Audit logging

A set becomes `VALIDATED` only when every enabled object succeeds. After validation, its refresh status becomes `READY_FOR_REFRESH`.

### Backup Retention

```text
Keep the latest 2 validated backup sets
Delete older physical backup objects
Keep registry and audit metadata indefinitely
```

Retention runs only after:

```text
Backup VALIDATED
        ↓
Full Refresh SUCCESS
        ↓
Post-Refresh Validation PASS
        ↓
Retention
```

Failed and pending sets are not valid recovery points.

### Backup Monitoring Views

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
```

---

## Data Contract Architecture

The platform implements contracts throughout the Lakehouse lifecycle.

```text
Business Contract
        ↓
Source Contract
        ↓
Landing Contract
        ↓
Bronze Contract
        ↓
Silver Contract
        ↓
Data Product Contract
        ↓
Consumer Contract
        ↓
Certification Gate
```

Contract governance objects:

```text
governance.data_contracts
governance.data_contract_rules
governance.contract_violations
governance.release_gates
```

Contract enforcement includes:

- Purpose and ownership
- Authorized consumers
- Classification and permitted use
- Business keys and grain
- Explicit schemas
- Landing manifests
- Source-to-target mappings
- Deterministic deduplication
- Data-quality rules
- CDC and SCD policies
- Freshness validation
- Reconciliation
- Security validation
- Release gates
- Data-product certification

Certification rule:

```text
Implemented != Operational != Certified
```

---

## Incremental Target Architecture

The incremental architecture is deployed in parallel to the existing full-refresh objects.

```text
Append-Only Generator
          ↓
Landing run_id Folders
          ↓
Auto Loader
          ↓
Incremental Bronze
          ↓
Incremental Silver
          ↓
Incremental Gold
          ↓
Reconciliation
          ↓
Controlled Consumer Cutover
```

Recommended separate schemas:

```text
01_bronze_incremental
02_silver_incremental
03_gold_incremental
```

Each generator execution creates a unique immutable folder:

```text
SRC-01/cgm_readings/run_id=<run_id>
SRC-11/patient_master/run_id=<run_id>
```

Generator control tables:

```text
00_config.generator_state
00_config.generator_runs
00_config.generator_manifest
```

Incremental Bronze uses Auto Loader. Incremental Silver implements canonical models, stable keys, deterministic current-state selection, deduplication and eventual CDC/SCD policies. Incremental Gold publishes governed products after reconciliation.

---

## Prerequisites

- Unity Catalog-enabled Databricks workspace
- Lakeflow Pipelines enabled
- Serverless compute available for Lakeflow Pipelines
- Existing SQL Warehouse
- Databricks CLI authenticated
- Permission to create or use target catalogs and schemas
- Permission to create and query managed Delta tables
- Permission to execute deployed jobs and pipelines
- Git repository or Databricks Git Folder
- Synthetic source data only

Required Bundle variables:

```yaml
sql_warehouse_id
catalog_name
```

If the repository uses assigned notebook compute, it may also contain:

```yaml
existing_cluster_id
```

Default data catalog:

```yaml
dcp_synth
```

Backup catalog:

```yaml
dcp_synth_backup
```

---

## Installation

### 1. Open the Repository

On Windows:

```powershell
cd "C:\Users\d.motsou.wouamba\OneDrive - Accenture\_Github\Roche Diabetes Care Platform\01_DEV\01_Databricks-Demo_Diabetes-Management-Platform\diabetes_care_platform_demo_phase-1\diabetes_care_platform_demo"
```

In the Databricks Web Terminal:

```bash
cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo
```

Verify the Bundle root:

```bash
pwd
find . -maxdepth 2 -name "databricks.yml"
```

Expected:

```text
./databricks.yml
```

### 2. Create a Development Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/dcp-backup-incremental
```

### 3. Authenticate the Databricks CLI

```bash
databricks version
databricks auth login --host https://<workspace-host>
databricks current-user me
```

### 4. Add Backup and Test Files

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
├── dcp_backup_and_full_refresh.yml
└── dcp_backup_test_suite.yml

tests/backup/
├── 00_preflight.py
├── 01_assert_created_backup.py
├── 02_assert_full_refresh_contract.py
├── 03_assert_retention_and_registry.py
├── 04_static_notebook_contract.py
└── 90_negative_test_plan.md
```

### 5. Verify Bundle Includes

```yaml
include:
  - resources/*.yml
```

### 6. Configure Variables

```yaml
variables:
  sql_warehouse_id:
    description: Existing SQL Warehouse ID

  catalog_name:
    description: Main Unity Catalog
    default: dcp_synth
```

Example target:

```yaml
targets:
  dev:
    mode: development
    default: true

    variables:
      catalog_name: dcp_synth
      sql_warehouse_id: "<SQL_WAREHOUSE_ID>"
```

Do not commit secrets or tokens into Bundle configuration.

### 7. Validate Resource References

The guarded wrapper expects:

```yaml
${resources.jobs.dcp_lakeflow_deployment.id}
```

The Dashboard pipeline resource key is expected to be:

```text
dcp_dashboard_pipeline_v2
```

Adjust the YAML only if the current repository uses different resource keys.

---

## Initial Platform Setup

Execute once, in order:

```text
00_backup_foundation.sql
        ↓
01_backup_object_config.sql
        ↓
02_backup_views.sql
```

After loading placeholder configuration, verify every enabled source exists:

```sql
SHOW TABLES IN dcp_synth.`01_bronze`;
SHOW TABLES IN dcp_synth.`02_silver`;
SHOW TABLES IN dcp_synth.`03_gold`;
```

Disable or correct any placeholder object that is not present.

---

## Environment Configuration

### DEV

Used for feature development, integration tests, backup tests, recovery tests and incremental-pipeline development.

```bash
databricks bundle validate -t dev
databricks bundle deploy -t dev
```

### TEST

Used for regression testing, contract validation, recovery drills and reconciliation.

```bash
databricks bundle validate -t test
databricks bundle deploy -t test
```

### PROD

Used only after controlled release approval.

```bash
databricks bundle validate -t prod
databricks bundle deploy -t prod
```

Production automation should use a least-privilege service-principal run-as identity.

---

## Repository Structure

```text
diabetes_care_platform_demo/
├── README.md
├── databricks.yml
├── resources/
│   ├── dcp_pipelines.yml
│   ├── dcp_pipeline_job.yml
│   ├── dcp_backup_and_full_refresh.yml
│   └── dcp_backup_test_suite.yml
├── src/
│   ├── setup/
│   ├── notebooks/
│   │   ├── backup/
│   │   │   ├── create_validate_backup.py
│   │   │   ├── validate_full_refresh.py
│   │   │   └── apply_retention.py
│   │   ├── 02_generate_healthcare_landing_notebook.py
│   │   ├── 03_generate_domain_landing_notebook.py
│   │   ├── 08_generate_complete_dashboard_data_notebook.py
│   │   └── 10_validate_deployment_notebook.py
│   ├── sql/
│   │   ├── backup/
│   │   │   ├── 00_backup_foundation.sql
│   │   │   ├── 01_backup_object_config.sql
│   │   │   └── 02_backup_views.sql
│   │   ├── contracts/
│   │   ├── dashboard_views/
│   │   └── 11_create_data_quality_validation_views.sql
│   └── pipelines/
│       ├── bronze_pipeline.py
│       ├── silver_pipeline.py
│       ├── gold_pipeline.py
│       └── dashboard_pipeline.py
├── tests/
│   ├── static_validate.py
│   └── backup/
│       ├── 00_preflight.py
│       ├── 01_assert_created_backup.py
│       ├── 02_assert_full_refresh_contract.py
│       ├── 03_assert_retention_and_registry.py
│       ├── 04_static_notebook_contract.py
│       └── 90_negative_test_plan.md
├── docs/
│   ├── architecture/
│   ├── runbooks/
│   └── contracts/
└── tools/
    └── DCP_Bundle_Deploy_Helper_Notebook.py
```

---

## Validate and Deploy

Run Bundle commands from the repository root.

```bash
databricks bundle validate -t dev
databricks bundle summary -t dev
databricks bundle deploy -t dev
```

---

## Run the Platform

### Existing Full Deployment

```bash
databricks bundle run dcp_lakeflow_deployment -t dev
```

Use this direct job primarily for engineering diagnostics after the guarded wrapper is active.

### Guarded Full Refresh

```bash
databricks bundle run dcp_backup_and_full_refresh -t dev
```

Workflow:

```text
create_validate_backup
          ↓
run dcp_lakeflow_deployment
          ↓
validate_full_refresh
          ↓
apply_retention
```

A failed backup prevents the platform job from starting. A failed post-refresh validation prevents retention.

### Backup Test Suite

```bash
databricks bundle run dcp_backup_notebook_test_suite -t dev
```

The suite creates one real backup set. Run it only in `dev` until storage costs and the protected inventory have been approved.

### Individual Pipelines

```bash
databricks bundle run dcp_bronze_pipeline -t dev
databricks bundle run dcp_silver_pipeline -t dev
databricks bundle run dcp_gold_pipeline -t dev
databricks bundle run dcp_dashboard_pipeline_v2 -t dev
```

Use `databricks bundle summary -t dev` to verify exact resource keys.

---

## Testing Strategy

```text
Static tests
    ↓
Schema and contract tests
    ↓
Data-quality tests
    ↓
Pipeline integration tests
    ↓
Backup integration tests
    ↓
Full-refresh validation
    ↓
Recovery drills
    ↓
End-to-end acceptance
```

The backup suite validates:

- Foundation objects and views
- Configuration uniqueness and allowed domains
- Source-object existence
- Backup creation and status
- Row-count equality
- Schema validation
- Backup-object readability
- Registry integrity
- Retention rules
- Full-refresh contract
- Static notebook requirements

Manual negative tests are documented in:

```text
tests/backup/90_negative_test_plan.md
```

---

## Post-Installation Validation

### Foundation Tables

```sql
SHOW TABLES IN dcp_synth_backup.admin;
```

### Monitoring Views

```sql
SHOW VIEWS IN dcp_synth_backup.admin;
```

### Enabled Inventory

```sql
SELECT *
FROM dcp_synth_backup.admin.backup_object_config
WHERE enabled = true
ORDER BY layer, source_object;
```

### Invalid Domains

```sql
SELECT *
FROM dcp_synth_backup.admin.backup_object_config
WHERE criticality NOT IN ('CRITICAL', 'IMPORTANT', 'OPTIONAL')
   OR preferred_backup_method NOT IN ('DEEP_CLONE', 'CTAS_SNAPSHOT');
```

Expected: `0 rows`.

### Duplicate Enabled Sources

```sql
SELECT source_object, count(*) AS configured_count
FROM dcp_synth_backup.admin.backup_object_config
WHERE enabled = true
GROUP BY source_object
HAVING count(*) > 1;
```

Expected: `0 rows`.

---

## Monitoring and Operations

### Backup Health

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_health;
```

### Recent Sets

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_summary
ORDER BY started_at DESC;
```

### Latest Recovery Point

```sql
SELECT *
FROM dcp_synth_backup.admin.v_latest_recovery_point;
```

### Failures

```sql
SELECT *
FROM dcp_synth_backup.admin.v_backup_validation_failures;
```

### Recovery Inventory

```sql
SELECT *
FROM dcp_synth_backup.admin.v_recovery_inventory;
```

### Retention Candidates

```sql
SELECT *
FROM dcp_synth_backup.admin.v_retention_candidates;
```

### Execution Audit

```sql
SELECT *
FROM dcp_synth_backup.admin.backup_execution_log
ORDER BY executed_at DESC;
```

Operational alerts should cover:

- Backup failure
- Full-refresh failure
- Post-refresh validation failure
- Retention failure
- Pipeline failure
- Schema drift
- Source silence
- Freshness breach
- Critical DQ failure
- Recovery-test failure

---

## Rollback and Recovery

### Code Rollback

```bash
git checkout <known-good-tag>
databricks bundle validate -t dev
databricks bundle deploy -t dev
```

### Data Recovery

Find the latest recovery point:

```sql
SELECT *
FROM dcp_synth_backup.admin.v_latest_recovery_point;
```

List protected objects:

```sql
SELECT *
FROM dcp_synth_backup.admin.v_recovery_inventory
WHERE backup_set_id = '<BACKUP_SET_ID>';
```

Recommended process:

```text
Select validated recovery point
          ↓
Restore to isolated recovery schema
          ↓
Run technical validation
          ↓
Run business and DQ validation
          ↓
Validate permissions and consumers
          ↓
Approve controlled promotion
```

Do not:

- Restore from `PENDING` or `FAILED` sets
- Delete streaming checkpoints as routine recovery
- Apply retention while validation is unresolved
- Promote restored data without evidence

---

## Known Limitations

- Synthetic data only
- The existing generator may still regenerate complete source datasets
- Incremental ingestion is a parallel target architecture
- Backup validation focuses on existence, schema, counts and readability
- CTAS protects queryable data but not Lakeflow definitions
- Recovery execution remains controlled and manual
- Cross-workspace and cross-region disaster recovery are not implemented
- Backup retention defaults to two validated recovery points
- Placeholder backup objects must be reconciled with actual deployed relations
- Some products may be modeled but not operationally certified
- Production healthcare approval is outside this repository's scope

---

## Safety Boundary

Supported uses:

- Demonstrations
- Proofs of concept
- Engineering validation
- Architecture reviews
- Training
- Certification preparation

Unsupported uses:

- Real patient data
- Production clinical decisions
- Regulated processing without additional approval
- Unapproved sensitive data
- Production healthcare integration without additional controls

---

## Definition of Done

### Full Refresh

- [ ] Bundle validation succeeds
- [ ] Bundle deployment succeeds
- [ ] Backup foundation exists
- [ ] Backup configuration is valid
- [ ] Backup set is `VALIDATED`
- [ ] Refresh status is `READY_FOR_REFRESH`
- [ ] Bronze, Silver, Gold and Dashboard pipelines complete
- [ ] Quality views are created
- [ ] Deployment validation passes
- [ ] Post-refresh validation passes
- [ ] Retention completes
- [ ] At most two active validated sets remain
- [ ] Latest recovery point is visible
- [ ] Audit evidence is available
- [ ] No critical contract violation remains unresolved

### Incremental Processing

- [ ] Generator creates immutable run folders
- [ ] No-data run creates no duplicates
- [ ] Auto Loader processes only new files
- [ ] Business keys remain unique
- [ ] Current-state ordering is deterministic
- [ ] Full-refresh and incremental results reconcile
- [ ] Recovery behavior is tested
- [ ] Performance and cost are acceptable
- [ ] Consumer cutover is approved

---

## Command Summary

```bash
# Validate
databricks bundle validate -t dev

# Inspect resources
databricks bundle summary -t dev

# Deploy
databricks bundle deploy -t dev

# Existing deployment, engineering use
databricks bundle run dcp_lakeflow_deployment -t dev

# Standard protected full refresh
databricks bundle run dcp_backup_and_full_refresh -t dev

# Backup test suite
databricks bundle run dcp_backup_notebook_test_suite -t dev

# Individual pipelines
databricks bundle run dcp_bronze_pipeline -t dev
databricks bundle run dcp_silver_pipeline -t dev
databricks bundle run dcp_gold_pipeline -t dev
databricks bundle run dcp_dashboard_pipeline_v2 -t dev
```

### Git Workflow

```bash
git status
git add .
git commit -m "Add guarded backup and recovery framework"
git push
```

---

## Recommended Operating Model

### Development

```text
Feature Branch
      ↓
Bundle Validate
      ↓
Bundle Deploy to DEV
      ↓
Run Tests
      ↓
Review Evidence
      ↓
Pull Request
```

### Incremental Processing

```text
Append-Only Generator
      ↓
Incremental Bronze
      ↓
Incremental Silver
      ↓
Incremental Gold
      ↓
Reconciliation and Monitoring
```

### Controlled Full Refresh

```text
Create Backup
      ↓
Validate Backup
      ↓
Execute Existing Full Refresh
      ↓
Validate Platform
      ↓
Apply Two-Backup Retention
```

### Recovery

```text
Latest Validated Backup
      ↓
Isolated Restore
      ↓
Technical Validation
      ↓
Business Validation
      ↓
Controlled Promotion
```
