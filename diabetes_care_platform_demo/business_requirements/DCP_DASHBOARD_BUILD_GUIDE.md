# DCP Dashboard Build Guide

## Purpose

This guide explains how to build, validate, publish, and operate the current dashboard scope in Databricks using the confirmed `dcp_synth.04_presentation` serving views.

The dashboard layer must remain thin. Business rules, aggregation logic, naming, and reusable metrics belong in the presentation views or governed Gold data products. Dashboards should focus on filtering, visualization, navigation, and user experience.

---

## Current Dashboard Scope

Build these four dashboards:

1. **CIO Executive Dashboard**
2. **Platform Operations Dashboard**
3. **Patient and Consent Dashboard**
4. **Glucose Management Dashboard**

The following domains are intentionally excluded from the current release:

- Regulatory dashboard
- Compliance dashboard
- DP-15
- DP-19
- DP-21

Do not add those domains until their upstream Gold products and contracts are implemented and validated.

---

## Architecture

```text
Landing / Pipelines
        ↓
Bronze
        ↓
Silver
        ↓
Gold Data Products
        ↓
04_presentation Views
        ↓
Databricks Dashboards
```

Dashboard queries must use:

```text
dcp_synth.04_presentation.*
```

Avoid direct dashboard dependencies on:

```text
/Volumes/...
01_bronze.*
02_silver.*
```

unless a temporary diagnostic dashboard is explicitly required.

---

## Prerequisites

Before building dashboards, confirm:

- The `dcp_synth` catalog exists.
- The `04_presentation` schema exists.
- The confirmed presentation views resolve successfully.
- The SQL Warehouse is available.
- The dashboard author has `USE CATALOG`, `USE SCHEMA`, and `SELECT` permissions.
- The current data is synthetic and non-production.
- Regulatory and compliance content remains out of scope.

Run:

```sql
USE CATALOG dcp_synth;

SHOW VIEWS IN `04_presentation`;
```

---

## Confirmed Presentation Views

### CIO

```text
vw_cio_service_trend
vw_cio_control_posture
vw_cio_resource_mix
vw_cio_adoption
vw_cio_release_readiness
```

### Platform Operations

```text
vw_platform_source_health
vw_platform_pipeline_runs
vw_platform_exception_queue
vw_platform_recovery
```

### Patient and Consent

```text
vw_patient_alerts
vw_patient_report_sharing
vw_consent_current_summary
vw_consent_propagation_summary
```

### Glucose Management

```text
vw_glucose_timeline
vw_glucose_daily_summary
```

The two Glucose Management views are created by:

```text
14_glucose_management_presentation_views.sql
```

---

# Phase 1: Validate the Serving Contract

## 1.1 Validate all confirmed views

```sql
USE CATALOG dcp_synth;

SELECT 'vw_cio_service_trend' AS view_name, COUNT(*) AS row_count
FROM `04_presentation`.vw_cio_service_trend

UNION ALL
SELECT 'vw_cio_control_posture', COUNT(*)
FROM `04_presentation`.vw_cio_control_posture

UNION ALL
SELECT 'vw_cio_resource_mix', COUNT(*)
FROM `04_presentation`.vw_cio_resource_mix

UNION ALL
SELECT 'vw_cio_adoption', COUNT(*)
FROM `04_presentation`.vw_cio_adoption

UNION ALL
SELECT 'vw_cio_release_readiness', COUNT(*)
FROM `04_presentation`.vw_cio_release_readiness

UNION ALL
SELECT 'vw_platform_source_health', COUNT(*)
FROM `04_presentation`.vw_platform_source_health

UNION ALL
SELECT 'vw_platform_pipeline_runs', COUNT(*)
FROM `04_presentation`.vw_platform_pipeline_runs

UNION ALL
SELECT 'vw_platform_exception_queue', COUNT(*)
FROM `04_presentation`.vw_platform_exception_queue

UNION ALL
SELECT 'vw_platform_recovery', COUNT(*)
FROM `04_presentation`.vw_platform_recovery

UNION ALL
SELECT 'vw_patient_alerts', COUNT(*)
FROM `04_presentation`.vw_patient_alerts

UNION ALL
SELECT 'vw_patient_report_sharing', COUNT(*)
FROM `04_presentation`.vw_patient_report_sharing

UNION ALL
SELECT 'vw_consent_current_summary', COUNT(*)
FROM `04_presentation`.vw_consent_current_summary

UNION ALL
SELECT 'vw_consent_propagation_summary', COUNT(*)
FROM `04_presentation`.vw_consent_propagation_summary

UNION ALL
SELECT 'vw_glucose_timeline', COUNT(*)
FROM `04_presentation`.vw_glucose_timeline

UNION ALL
SELECT 'vw_glucose_daily_summary', COUNT(*)
FROM `04_presentation`.vw_glucose_daily_summary

ORDER BY view_name;
```

## 1.2 Acceptance criteria

- Every query resolves.
- No `TABLE_OR_VIEW_NOT_FOUND` error occurs.
- No `UNRESOLVED_COLUMN` error occurs.
- Row counts are plausible for the synthetic data set.
- Glucose summary data satisfies the range consistency rule.

```sql
SELECT
    patient_id,
    measure_date,
    tir_pct,
    tbr_pct,
    tar_pct,
    ROUND(tir_pct + tbr_pct + tar_pct, 2) AS total_range_pct
FROM `04_presentation`.vw_glucose_daily_summary
WHERE ABS(tir_pct + tbr_pct + tar_pct - 100.0) > 0.1;
```

Expected result:

```text
0 rows
```

---

# Phase 2: Create the Dashboards

Open the Databricks workspace and use the dashboard creation experience available in the workspace.

For each dashboard:

1. Create a new dashboard.
2. Assign the configured SQL Warehouse.
3. Add datasets using SQL queries against `dcp_synth.04_presentation`.
4. Create filters before adding detailed visuals.
5. Add visuals in the recommended order.
6. Verify cross-filter behavior.
7. Review titles, descriptions, units, and time context.
8. Publish only after the dashboard-specific checks pass.

Recommended naming:

```text
DCP - CIO Executive
DCP - Platform Operations
DCP - Patient and Consent
DCP - Glucose Management
```

Add a visible subtitle to every dashboard:

```text
Synthetic non-production data
```

---

# Dashboard 1: CIO Executive

## Objective

Provide a concise management view of service performance, control posture, resource mix, adoption, and Data Product release readiness.

## Recommended layout

```text
┌──────────────────────────────────────────────────────────────┐
│ DCP - CIO Executive                                         │
│ Synthetic non-production data                               │
├──────────────┬──────────────┬──────────────┬─────────────────┤
│ Latest SLA   │ Adoption     │ Control      │ Products Ready  │
├──────────────┴──────────────┴──────────────┴─────────────────┤
│ Service Trend                                                │
├─────────────────────────────┬────────────────────────────────┤
│ Control Posture             │ Resource Utilization / Cost    │
├─────────────────────────────┴────────────────────────────────┤
│ Release Readiness                                             │
└──────────────────────────────────────────────────────────────┘
```

## Dataset 1: Latest service metrics

```sql
SELECT
    metric_name,
    metric_value,
    target_value,
    status,
    metric_date
FROM dcp_synth.`04_presentation`.vw_cio_service_trend
WHERE metric_date = (
    SELECT MAX(metric_date)
    FROM dcp_synth.`04_presentation`.vw_cio_service_trend
)
ORDER BY metric_name;
```

### Visual

- Type: KPI cards
- Value: `metric_value`
- Label: `metric_name`
- Supporting value: `target_value`
- Status cue: `status`

### Presentation note

The cards show the latest synthetic service indicators and their configured targets. The view is operational evidence for the demo, not a production service-level attestation.

## Dataset 2: Service trend

```sql
SELECT
    metric_date,
    metric_name,
    metric_value,
    target_value,
    status
FROM dcp_synth.`04_presentation`.vw_cio_service_trend
ORDER BY metric_date, metric_name;
```

### Visual

- Type: multi-series line chart
- X-axis: `metric_date`
- Y-axis: `metric_value`
- Series: `metric_name`
- Optional reference: `target_value`

### Presentation note

This visual shows how availability, pipeline success, and freshness indicators evolve over the synthetic reporting period.

## Dataset 3: Control posture

```sql
SELECT
    control_domain,
    score_pct,
    assessed_at
FROM dcp_synth.`04_presentation`.vw_cio_control_posture
ORDER BY score_pct;
```

### Visual

- Type: horizontal bar chart
- Category: `control_domain`
- Value: `score_pct`
- Tooltip: `assessed_at`

### Presentation note

The chart compares synthetic control scores across quality, consent, security, and recovery domains.

## Dataset 4: Resource mix

```sql
SELECT
    resource_type,
    utilization_pct,
    cost_share_pct,
    metric_time
FROM dcp_synth.`04_presentation`.vw_cio_resource_mix
ORDER BY resource_type;
```

### Visuals

- Clustered bar chart: `utilization_pct` by `resource_type`
- Donut or bar chart: `cost_share_pct` by `resource_type`

### Presentation note

The visuals separate capacity utilization from cost allocation. Do not interpret cost share as an actual invoice or billing record.

## Dataset 5: Adoption

```sql
SELECT
    experience,
    eligible_users,
    active_users,
    adoption_pct,
    metric_date
FROM dcp_synth.`04_presentation`.vw_cio_adoption
ORDER BY adoption_pct DESC;
```

### Visual

- Type: horizontal bar chart
- Category: `experience`
- Value: `adoption_pct`
- Tooltip: `eligible_users`, `active_users`, `metric_date`

### Presentation note

Adoption is calculated as active users divided by eligible users. `NULLIF` in the presentation view prevents division by zero.

## Dataset 6: Release readiness

```sql
SELECT
    product_id,
    maturity,
    readiness_status,
    owner,
    next_action
FROM dcp_synth.`04_presentation`.vw_cio_release_readiness
ORDER BY readiness_status, product_id;
```

### Visual

- Type: table
- Conditional formatting: `readiness_status`
- Recommended columns: all fields

### Presentation note

The table distinguishes maturity from readiness. Implemented does not automatically mean tested, operational, or certified.

## CIO dashboard filters

Recommended filters:

```text
metric_date
metric_name
control_domain
readiness_status
product_id
```

---

# Dashboard 2: Platform Operations

## Objective

Provide operational visibility into source freshness, pipeline execution, exceptions, and recovery readiness.

## Recommended layout

```text
┌──────────────────────────────────────────────────────────────┐
│ DCP - Platform Operations                                   │
│ Synthetic non-production data                               │
├───────────────┬────────────────┬─────────────────────────────┤
│ Source Health │ Pipeline Runs  │ Recovery                    │
├───────────────┴────────────────┴─────────────────────────────┤
│ Pipeline Duration and Status                                │
├──────────────────────────────────────────────────────────────┤
│ Exception Queue                                              │
└──────────────────────────────────────────────────────────────┘
```

## Dataset 1: Source health

```sql
SELECT
    source_id,
    source_name,
    domain,
    freshness_minutes,
    freshness_status,
    lifecycle_status
FROM dcp_synth.`04_presentation`.vw_platform_source_health
ORDER BY freshness_minutes DESC, source_id;
```

### Visuals

- Table with conditional formatting on `freshness_status`
- Bar chart of source count by `freshness_status`

### Presentation note

The dataset highlights synthetic source freshness and lifecycle status. A stale source should lead to source-level investigation before downstream repair.

## Dataset 2: Pipeline run status

```sql
SELECT
    status,
    COUNT(*) AS run_count
FROM dcp_synth.`04_presentation`.vw_platform_pipeline_runs
GROUP BY status
ORDER BY run_count DESC;
```

### Visual

- Type: bar chart or donut chart
- Category: `status`
- Value: `run_count`

## Dataset 3: Pipeline duration trend

```sql
SELECT
    started_at,
    source_id,
    duration_seconds,
    status
FROM dcp_synth.`04_presentation`.vw_platform_pipeline_runs
ORDER BY started_at;
```

### Visual

- Type: line chart
- X-axis: `started_at`
- Y-axis: `duration_seconds`
- Series or color: `status`
- Filter: `source_id`

### Presentation note

Use this visual to identify duration trends and investigate deviations. The current values are synthetic and should not be treated as production SLO evidence.

## Dataset 4: Exception queue

```sql
SELECT
    exception_id,
    source_id,
    exception_type,
    severity,
    status,
    owner,
    next_action,
    opened_at
FROM dcp_synth.`04_presentation`.vw_platform_exception_queue
ORDER BY opened_at DESC;
```

### Visual

- Type: table
- Conditional formatting: `severity`, `status`
- Filters: `severity`, `status`, `source_id`

## Dataset 5: Recovery posture

```sql
SELECT
    layer,
    recovery_state,
    rto_hours,
    rpo_hours,
    tested_at
FROM dcp_synth.`04_presentation`.vw_platform_recovery
ORDER BY layer;
```

### Visuals

- Table or KPI grid
- Bar chart for `rto_hours` and `rpo_hours` by `layer`

### Presentation note

The recovery view communicates the synthetic recovery state and objectives per layer. Production recovery claims require real test evidence.

## Platform dashboard filters

Recommended filters:

```text
source_id
domain
freshness_status
lifecycle_status
pipeline status
severity
exception status
layer
```

---

# Dashboard 3: Patient and Consent

## Objective

Present synthetic alert, report-sharing, consent-state, and consent-propagation information without combining incompatible grains.

## Recommended layout

```text
┌──────────────────────────────────────────────────────────────┐
│ DCP - Patient and Consent                                   │
│ Synthetic non-production data                               │
├─────────────────────────────┬────────────────────────────────┤
│ Patient Alerts              │ Report Sharing                 │
├─────────────────────────────┼────────────────────────────────┤
│ Consent Current State       │ Consent Propagation            │
└─────────────────────────────┴────────────────────────────────┘
```

## Dataset 1: Patient alerts

```sql
SELECT
    alert_type,
    status,
    COUNT(*) AS alert_count
FROM dcp_synth.`04_presentation`.vw_patient_alerts
GROUP BY alert_type, status
ORDER BY alert_type, status;
```

### Visual

- Type: stacked bar chart
- Category: `alert_type`
- Series: `status`
- Value: `alert_count`

## Dataset 2: Alert detail

```sql
SELECT
    alert_id,
    patient_id,
    alert_type,
    status,
    created_at
FROM dcp_synth.`04_presentation`.vw_patient_alerts
ORDER BY created_at DESC;
```

### Visual

- Type: table
- Filters: `patient_id`, `alert_type`, `status`

## Dataset 3: Report sharing

```sql
SELECT
    recipient_type,
    sharing_status,
    COUNT(*) AS sharing_count
FROM dcp_synth.`04_presentation`.vw_patient_report_sharing
GROUP BY recipient_type, sharing_status
ORDER BY recipient_type, sharing_status;
```

### Visual

- Type: stacked bar chart
- Category: `recipient_type`
- Series: `sharing_status`
- Value: `sharing_count`

## Dataset 4: Consent current summary

```sql
SELECT
    consent_scope,
    purpose,
    recipient,
    current_state,
    patient_scope_count,
    latest_effective_at
FROM dcp_synth.`04_presentation`.vw_consent_current_summary
ORDER BY consent_scope, current_state;
```

### Visuals

- Stacked bar chart by `consent_scope` and `current_state`
- Detail table with purpose and recipient

### Presentation note

The view summarizes current consent state by consent scope, purpose, recipient, and state. It does not represent an event timeline.

## Dataset 5: Consent propagation summary

```sql
SELECT
    target_system,
    target_status,
    propagation_count,
    refreshed_at
FROM dcp_synth.`04_presentation`.vw_consent_propagation_summary
ORDER BY target_system, target_status;
```

### Visual

- Type: stacked bar chart
- Category: `target_system`
- Series: `target_status`
- Value: `propagation_count`

### Presentation note

This view shows the distribution of propagation states per target system and the latest observed ingestion timestamp.

## Patient and Consent filters

Recommended filters:

```text
patient_id
alert_type
alert status
recipient_type
sharing_status
consent_scope
current_state
target_system
target_status
```

Do not force one global `patient_id` filter onto the aggregated consent summary views unless the serving contract includes `patient_id`.

---

# Dashboard 4: Glucose Management

## Objective

Combine detailed glucose evidence from DP-01 with daily patient-level insight from DP-02 while preserving the different grains.

```text
DP-01 Patient Glucose Timeline
        ↓
04_presentation.vw_glucose_timeline
        ↓
Detailed time-series visuals

DP-02 Patient Glucose Summary
        ↓
04_presentation.vw_glucose_daily_summary
        ↓
KPI cards and summary visuals
```

## Recommended layout

```text
┌──────────────────────────────────────────────────────────────┐
│ DCP - Glucose Management                                    │
│ Synthetic non-production data                               │
├────────────┬────────────┬────────────┬───────────────────────┤
│ Mean       │ TIR %      │ TBR %      │ TAR %                 │
├────────────┴────────────┴────────────┴───────────────────────┤
│ Glucose Timeline                                             │
├─────────────────────────────┬────────────────────────────────┤
│ TIR / TBR / TAR             │ Daily Summary                 │
├─────────────────────────────┴────────────────────────────────┤
│ Data Coverage and Refresh Information                        │
└──────────────────────────────────────────────────────────────┘
```

## Required dashboard filters

Create these filters first:

```text
patient_id
measure_date
```

Optional time control:

```text
event_time range
```

The dashboard should normally require one selected `patient_id` for patient-centric analysis.

## Dataset 1: Latest daily summary

```sql
WITH ranked AS (
    SELECT
        patient_id,
        measure_date,
        mean_glucose_mmol_l,
        tir_pct,
        tbr_pct,
        tar_pct,
        reading_count,
        refreshed_at,
        ROW_NUMBER() OVER (
            PARTITION BY patient_id
            ORDER BY measure_date DESC, refreshed_at DESC
        ) AS rn
    FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary
)
SELECT
    patient_id,
    measure_date,
    mean_glucose_mmol_l,
    tir_pct,
    tbr_pct,
    tar_pct,
    reading_count,
    refreshed_at
FROM ranked
WHERE rn = 1;
```

### Visuals

Create four KPI cards:

```text
Mean Glucose
TIR %
TBR %
TAR %
```

Supporting cards:

```text
Reading Count
Measure Date
Refreshed At
```

### Presentation note

DP-02 is a patient-and-period summary. KPI values are meaningful only with the selected patient and reporting date visible.

## Dataset 2: Glucose timeline

```sql
SELECT
    patient_id,
    event_time,
    glucose_mmol_l,
    source_id
FROM dcp_synth.`04_presentation`.vw_glucose_timeline
ORDER BY patient_id, event_time;
```

### Visual

- Type: line chart
- X-axis: `event_time`
- Y-axis: `glucose_mmol_l`
- Filter: `patient_id`
- Tooltip: `source_id`

### Presentation note

The timeline answers “what happened over time?” at event-level grain. Do not repeat daily-summary metrics on every event row.

## Dataset 3: Daily glucose trend

```sql
SELECT
    patient_id,
    measure_date,
    mean_glucose_mmol_l,
    reading_count,
    refreshed_at
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary
ORDER BY patient_id, measure_date;
```

### Visual

- Type: line chart
- X-axis: `measure_date`
- Y-axis: `mean_glucose_mmol_l`
- Tooltip: `reading_count`, `refreshed_at`
- Filter: `patient_id`

## Dataset 4: TIR/TBR/TAR composition

```sql
SELECT
    patient_id,
    measure_date,
    'TIR' AS range_category,
    tir_pct AS percentage
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary

UNION ALL

SELECT
    patient_id,
    measure_date,
    'TBR' AS range_category,
    tbr_pct AS percentage
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary

UNION ALL

SELECT
    patient_id,
    measure_date,
    'TAR' AS range_category,
    tar_pct AS percentage
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary;
```

### Visual

- Preferred type: 100% stacked bar chart
- X-axis: `measure_date`
- Stack: `range_category`
- Value: `percentage`
- Filter: `patient_id`

Alternative for one selected date:

- Donut chart for TIR/TBR/TAR composition

### Presentation note

The composition visual shows how valid readings are distributed across below-range, in-range, and above-range categories for the selected patient and date.

## Dataset 5: Daily summary table

```sql
SELECT
    patient_id,
    measure_date,
    mean_glucose_mmol_l,
    tir_pct,
    tbr_pct,
    tar_pct,
    reading_count,
    refreshed_at,
    ROUND(tir_pct + tbr_pct + tar_pct, 2) AS total_range_pct
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary
ORDER BY patient_id, measure_date DESC;
```

### Visual

- Type: table
- Conditional formatting:
  - `total_range_pct` when outside the accepted tolerance
  - `reading_count` when unexpectedly low for the demo contract

## Glucose dashboard acceptance criteria

- A selected patient filters both DP-01 and DP-02 visuals.
- The timeline contains event-level observations.
- The summary contains patient + date rows.
- TIR, TBR, and TAR each remain between 0 and 100.
- TIR + TBR + TAR is within 0.1 of 100.
- `reading_count` is positive.
- The selected `measure_date` is visible to the user.
- The dashboard is clearly labeled as synthetic and non-production.

---

# Phase 3: Visual and UX Standards

## Titles

Use business-readable titles:

```text
Service Performance Trend
Control Posture by Domain
Source Freshness
Pipeline Duration
Patient Alerts
Consent State by Scope
Glucose Timeline
Time in Range Distribution
```

Avoid exposing physical object names as visual titles.

## Units

Always show units where applicable:

```text
glucose_mmol_l → mmol/L
percentage fields → %
duration_seconds → seconds
freshness_minutes → minutes
rto_hours / rpo_hours → hours
```

## Time context

Every KPI derived from time-sensitive data should expose a date or timestamp:

```text
metric_date
measure_date
assessed_at
refreshed_at
tested_at
```

## Color usage

Recommended semantic colors:

```text
GREEN / READY / SUCCESS       → green
AMBER / WARNING / AT_RISK     → amber
FAILED / STALE / BLOCKED      → red
REVOKED / EXPIRED             → gray or red based on audience
```

Do not rely only on color. Include labels and legends.

## Tables

Use tables for:

- Release readiness
- Exception queues
- Alert details
- Recovery posture
- Daily glucose details

Keep identifier columns available in tooltips or detail tables for traceability.

---

# Phase 4: Security and Access

The current data is synthetic. Before any non-synthetic use:

- Implement row-level access for patient-scoped dashboards.
- Restrict patient identifiers to authorized consumers.
- Apply least privilege to `04_presentation`.
- Separate dashboard author and viewer permissions.
- Review dashboard sharing settings.
- Validate that cached or exported dashboard data follows policy.
- Do not treat presentation views as an authorization boundary by themselves.

Recommended access flow:

```text
Authenticated identity
        ↓
Authorized group / entitlement
        ↓
Governed presentation view
        ↓
Dashboard
```

---

# Phase 5: Dashboard Validation

## Functional tests

For every dashboard:

- Open all visuals.
- Apply each filter.
- Clear filters.
- Test empty-filter states.
- Test one-value selections.
- Confirm cross-filter behavior.
- Confirm titles and units.
- Confirm timestamps are visible.
- Confirm no visual queries inaccessible schemas directly.

## Data tests

Run:

```sql
SELECT
    table_name
FROM system.information_schema.views
WHERE table_catalog = 'dcp_synth'
  AND table_schema = '04_presentation'
ORDER BY table_name;
```

Run the combined serving-view count check documented earlier.

For Glucose Management:

```sql
SELECT COUNT(*) AS invalid_rows
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary
WHERE tir_pct < 0 OR tir_pct > 100
   OR tbr_pct < 0 OR tbr_pct > 100
   OR tar_pct < 0 OR tar_pct > 100
   OR ABS(tir_pct + tbr_pct + tar_pct - 100.0) > 0.1
   OR reading_count <= 0;
```

Expected:

```text
invalid_rows = 0
```

## Performance checks

For each dashboard:

- Record initial load behavior.
- Identify the slowest visual query.
- Avoid repeated scans of raw event data when a presentation summary exists.
- Limit large detail tables.
- Use dashboard filters to constrain patient and time ranges.
- Review SQL Warehouse query history for failed or slow queries.

Do not add caching or optimization changes without workload evidence.

---

# Phase 6: Publish and Share

Before publishing:

- Confirm dashboard name and description.
- Confirm synthetic-data label.
- Confirm the correct SQL Warehouse.
- Confirm all datasets use `04_presentation`.
- Confirm Regulatory and Compliance content is absent.
- Confirm permissions with the intended pilot audience.
- Confirm no draft or diagnostic visuals remain.

Recommended pilot audience:

```text
Data Engineering
Platform Operations
Architecture Review
Dashboard Product Owner
```

---

# Phase 7: Deployment and Source Control

## Bundle validation

From the repository root:

```bash
cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo

databricks bundle validate -t dev
```

If dashboard resources are represented in the Bundle, deploy them only after interactive validation:

```bash
databricks bundle deploy -t dev
```

## Git review

```bash
git status
git diff --stat
git diff
```

Stage:

```bash
git add .
git diff --cached
```

Commit example:

```bash
git commit -m "Add validated DCP dashboard serving views and build guide"
```

Push:

```bash
git push origin $(git branch --show-current)
```

---

# Rollback

If a new presentation view or dashboard breaks:

1. Do not modify the working baseline views unnecessarily.
2. Revert the specific new view definition.
3. Redeploy the previous known-good version.
4. Validate the serving-view counts.
5. Reopen and refresh the affected dashboard.

Keep these known-good domains independent:

```text
CIO
Platform Operations
Patient and Consent
Glucose Management
```

A failure in one new domain should not block or replace the working dashboard contracts in another domain.

---

# Final Definition of Done

## Serving layer

- [ ] All required `04_presentation` views exist.
- [ ] All views resolve without schema errors.
- [ ] Glucose range consistency checks pass.
- [ ] Regulatory and Compliance remain excluded.

## CIO Dashboard

- [ ] Latest SLA KPI cards work.
- [ ] Service trend works.
- [ ] Control posture works.
- [ ] Resource mix works.
- [ ] Adoption works.
- [ ] Release readiness works.

## Platform Operations Dashboard

- [ ] Source health works.
- [ ] Pipeline status and duration work.
- [ ] Exception queue works.
- [ ] Recovery posture works.

## Patient and Consent Dashboard

- [ ] Patient alerts work.
- [ ] Report sharing works.
- [ ] Consent current summary works.
- [ ] Consent propagation summary works.
- [ ] Different grains remain separate.

## Glucose Management Dashboard

- [ ] Patient filter works across DP-01 and DP-02 visuals.
- [ ] Glucose timeline works.
- [ ] Mean glucose KPI works.
- [ ] TIR KPI works.
- [ ] TBR KPI works.
- [ ] TAR KPI works.
- [ ] Range-composition visual works.
- [ ] Daily summary table works.
- [ ] Observation date and refresh timestamp are visible.

## Governance and release

- [ ] Synthetic non-production label is visible.
- [ ] Dashboard permissions are reviewed.
- [ ] Bundle validation passes.
- [ ] Git changes are reviewed, committed, and pushed.
- [ ] Dashboard owner and operational owner are recorded.
