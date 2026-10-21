# DCP Databricks AI/BI Dashboard Build Instructions

## Scope

Build these four dashboards on top of the confirmed presentation layer:

1. DCP - Glucose Management
2. DCP - CIO Executive
3. DCP - Platform Operations
4. DCP - Patient and Consent

Regulatory and Compliance are intentionally excluded from this release.

## Architecture rule

Use the presentation layer as the dashboard serving contract:

```text
Gold / governed products
        ↓
dcp_synth.04_presentation
        ↓
Databricks AI/BI Dashboards
```

Do not build production dashboard queries directly against landing Volume paths.

---

# 1. Prerequisites

In Databricks:

1. Confirm that you can use a SQL Warehouse.
2. Open SQL Editor.
3. Verify the presentation views:

```sql
USE CATALOG dcp_synth;
SHOW VIEWS IN `04_presentation`;
```

Required views for the four dashboards:

```text
vw_cio_service_trend
vw_cio_control_posture
vw_cio_resource_mix
vw_cio_adoption
vw_cio_release_readiness

vw_platform_source_health
vw_platform_pipeline_runs
vw_platform_exception_queue
vw_platform_recovery

vw_patient_alerts
vw_patient_report_sharing
vw_consent_current_summary
vw_consent_propagation_summary

vw_glucose_timeline
vw_glucose_daily_summary
```

---

# 2. Common Databricks Dashboard Workflow

For each dashboard:

1. In the Databricks sidebar select **New**.
2. Select **Dashboard**.
3. Rename the dashboard.
4. Select the SQL Warehouse used by the dashboard.
5. Open the **Data** tab.
6. Select **Add SQL dataset** for each dataset in this guide.
7. Paste the SQL query.
8. Select **Run** and verify that records are returned.
9. Rename the dataset with the name shown below.
10. Return to the dashboard canvas.
11. Select **Add a visualization**.
12. Select the corresponding dataset.
13. Configure chart type, axes, series, tooltips, and title.
14. Add filters where specified.
15. Test filters and cross-filter behavior.
16. Keep a visible label: **Synthetic non-production data**.
17. Publish only after the dashboard acceptance checks pass.

Use explicit column lists in SQL datasets rather than `SELECT *` unless a full relation is specifically needed.

---

# 3. Dashboard 1 - DCP Glucose Management

## 3.1 Create dashboard

Name:

```text
DCP - Glucose Management
```

Subtitle:

```text
Synthetic non-production data
```

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ DCP - Glucose Management            Patient ▼    Date ▼     │
├────────────┬────────┬────────┬────────┬──────────────────────┤
│ Mean       │ TIR    │ TBR    │ TAR    │ Reading Count        │
│ Glucose    │ %      │ %      │ %      │                      │
├────────────┴────────┴────────┴────────┴──────────────────────┤
│                     Glucose Timeline                         │
├──────────────────────────────┬───────────────────────────────┤
│ Daily Mean Glucose           │ Time in Range Distribution    │
├──────────────────────────────┴───────────────────────────────┤
│ Daily Glucose Summary                                        │
└──────────────────────────────────────────────────────────────┘
```

## 3.2 Dataset: Glucose Timeline

```sql
SELECT
    patient_id,
    event_time,
    glucose_mmol_l,
    source_id
FROM dcp_synth.`04_presentation`.vw_glucose_timeline;
```

Dataset name:

```text
Glucose Timeline
```

### Visualization

Type:

```text
Line chart
```

Fields:

```text
X-axis: event_time
Y-axis: glucose_mmol_l
Tooltip: source_id
```

Title:

```text
Glucose Timeline
```

Y-axis unit:

```text
mmol/L
```

## 3.3 Dataset: Glucose Daily Summary

```sql
SELECT
    patient_id,
    measure_date,
    mean_glucose_mmol_l,
    tir_pct,
    tbr_pct,
    tar_pct,
    reading_count,
    refreshed_at
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary;
```

Dataset name:

```text
Glucose Daily Summary
```

## 3.4 Add filters

Create filters for:

```text
patient_id
measure_date
```

The patient filter should affect the relevant Glucose Timeline and Glucose Daily Summary visualizations.

For KPI widgets, make the reporting date explicit so multiple dates are not unintentionally aggregated into one KPI value.

## 3.5 KPI widgets

Create Counter/KPI widgets from `Glucose Daily Summary`:

```text
Mean Glucose  → mean_glucose_mmol_l → mmol/L
TIR           → tir_pct             → %
TBR           → tbr_pct             → %
TAR           → tar_pct             → %
Reading Count → reading_count
```

## 3.6 Daily Mean Glucose

Dataset:

```text
Glucose Daily Summary
```

Visualization:

```text
Line chart
```

Fields:

```text
X-axis: measure_date
Y-axis: mean_glucose_mmol_l
Tooltip: reading_count, refreshed_at
```

Title:

```text
Daily Mean Glucose
```

## 3.7 Dataset: Glucose Range Distribution

Create another SQL dataset:

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

Dataset name:

```text
Glucose Range Distribution
```

### Visualization

```text
Type: 100% stacked bar chart
X-axis: measure_date
Y-axis: percentage
Series: range_category
```

Title:

```text
Time in Range Distribution
```

## 3.8 Daily Summary table

Dataset:

```text
Glucose Daily Summary
```

Columns:

```text
measure_date
mean_glucose_mmol_l
tir_pct
tbr_pct
tar_pct
reading_count
refreshed_at
```

Sort:

```text
measure_date DESC
```

## 3.9 Glucose validation

Run in SQL Editor:

```sql
SELECT
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
    COUNT(*) AS violation_count
FROM dcp_synth.`04_presentation`.vw_glucose_daily_summary
WHERE
       tir_pct IS NULL
    OR tbr_pct IS NULL
    OR tar_pct IS NULL
    OR tir_pct < 0 OR tir_pct > 100
    OR tbr_pct < 0 OR tbr_pct > 100
    OR tar_pct < 0 OR tar_pct > 100
    OR ABS(tir_pct + tbr_pct + tar_pct - 100.0) > 0.1;
```

Expected for the confirmed synthetic contract:

```text
PASS | 0
```

---

# 4. Dashboard 2 - DCP CIO Executive

## 4.1 Create dashboard

Name:

```text
DCP - CIO Executive
```

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ DCP - CIO Executive                                        │
├────────────┬────────────┬────────────┬──────────────────────┤
│ SLA        │ Adoption   │ Controls   │ Ready Products       │
├────────────┴────────────┴────────────┴──────────────────────┤
│ Service Performance Trend                                  │
├───────────────────────────┬─────────────────────────────────┤
│ Control Posture           │ Resource / Cost Mix             │
├───────────────────────────┴─────────────────────────────────┤
│ Release Readiness                                           │
└─────────────────────────────────────────────────────────────┘
```

## 4.2 Dataset: CIO Service

```sql
SELECT
    metric_date,
    metric_name,
    metric_value,
    target_value,
    status
FROM dcp_synth.`04_presentation`.vw_cio_service_trend;
```

Visual:

```text
Line chart
X-axis: metric_date
Y-axis: metric_value
Series: metric_name
```

Title:

```text
Service Performance Trend
```

## 4.3 Dataset: CIO Controls

```sql
SELECT
    control_domain,
    score_pct,
    assessed_at
FROM dcp_synth.`04_presentation`.vw_cio_control_posture;
```

Visual:

```text
Horizontal bar chart
Category: control_domain
Value: score_pct
```

## 4.4 Dataset: CIO Resources

```sql
SELECT
    resource_type,
    utilization_pct,
    cost_share_pct,
    metric_time
FROM dcp_synth.`04_presentation`.vw_cio_resource_mix;
```

Recommended visuals:

```text
Resource Utilization → bar chart → utilization_pct
Cost Share           → bar or donut → cost_share_pct
```

## 4.5 Dataset: CIO Adoption

```sql
SELECT
    experience,
    eligible_users,
    active_users,
    adoption_pct,
    metric_date
FROM dcp_synth.`04_presentation`.vw_cio_adoption;
```

Visual:

```text
Horizontal bar chart
Category: experience
Value: adoption_pct
```

## 4.6 Dataset: CIO Release Readiness

```sql
SELECT
    product_id,
    maturity,
    readiness_status,
    owner,
    next_action
FROM dcp_synth.`04_presentation`.vw_cio_release_readiness;
```

Visual:

```text
Table
```

Recommended filters:

```text
metric_date
metric_name
readiness_status
product_id
```

---

# 5. Dashboard 3 - DCP Platform Operations

## 5.1 Create dashboard

Name:

```text
DCP - Platform Operations
```

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ DCP - Platform Operations                                  │
├──────────────────┬─────────────────┬────────────────────────┤
│ Source Health    │ Pipeline Runs   │ Recovery               │
├──────────────────┴─────────────────┴────────────────────────┤
│ Pipeline Duration & Status                                 │
├─────────────────────────────────────────────────────────────┤
│ Exception Queue                                             │
└─────────────────────────────────────────────────────────────┘
```

## 5.2 Dataset: Source Health

```sql
SELECT
    source_id,
    source_name,
    domain,
    freshness_minutes,
    freshness_status,
    lifecycle_status
FROM dcp_synth.`04_presentation`.vw_platform_source_health;
```

Visual:

```text
Table
```

Useful filters:

```text
domain
freshness_status
lifecycle_status
```

## 5.3 Dataset: Pipeline Runs

```sql
SELECT
    pipeline_run_id,
    source_id,
    started_at,
    duration_seconds,
    status
FROM dcp_synth.`04_presentation`.vw_platform_pipeline_runs;
```

Create two visuals.

### Pipeline status visual

```text
Type: bar/donut
Category: status
Aggregation: count
```

### Pipeline duration visual

```text
Type: line chart
X-axis: started_at
Y-axis: duration_seconds
Filter: source_id
```

## 5.4 Dataset: Platform Exceptions

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
FROM dcp_synth.`04_presentation`.vw_platform_exception_queue;
```

Visual:

```text
Table
```

Filters:

```text
severity
status
source_id
```

## 5.5 Dataset: Recovery

```sql
SELECT
    layer,
    recovery_state,
    rto_hours,
    rpo_hours,
    tested_at
FROM dcp_synth.`04_presentation`.vw_platform_recovery;
```

Visual options:

```text
Table
KPI grid
Bar chart for RTO/RPO by layer
```

---

# 6. Dashboard 4 - DCP Patient and Consent

## 6.1 Create dashboard

Name:

```text
DCP - Patient and Consent
```

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ DCP - Patient and Consent                                  │
├───────────────────────────┬─────────────────────────────────┤
│ Patient Alerts            │ Report Sharing                  │
├───────────────────────────┼─────────────────────────────────┤
│ Consent Current State     │ Consent Propagation             │
└───────────────────────────┴─────────────────────────────────┘
```

## 6.2 Dataset: Patient Alerts

```sql
SELECT
    alert_type,
    status,
    COUNT(*) AS alert_count
FROM dcp_synth.`04_presentation`.vw_patient_alerts
GROUP BY alert_type, status;
```

Visual:

```text
Stacked bar chart
Category: alert_type
Series: status
Value: alert_count
```

## 6.3 Optional Alert Detail dataset

```sql
SELECT
    alert_id,
    patient_id,
    alert_type,
    status,
    created_at
FROM dcp_synth.`04_presentation`.vw_patient_alerts;
```

Visual:

```text
Table
```

## 6.4 Dataset: Report Sharing

```sql
SELECT
    recipient_type,
    sharing_status,
    COUNT(*) AS sharing_count
FROM dcp_synth.`04_presentation`.vw_patient_report_sharing
GROUP BY recipient_type, sharing_status;
```

Visual:

```text
Stacked bar chart
Category: recipient_type
Series: sharing_status
Value: sharing_count
```

## 6.5 Dataset: Consent Current State

```sql
SELECT
    consent_scope,
    purpose,
    recipient,
    current_state,
    patient_scope_count,
    latest_effective_at
FROM dcp_synth.`04_presentation`.vw_consent_current_summary;
```

Recommended visuals:

```text
Stacked bar chart
Table
```

## 6.6 Dataset: Consent Propagation

```sql
SELECT
    target_system,
    target_status,
    propagation_count,
    refreshed_at
FROM dcp_synth.`04_presentation`.vw_consent_propagation_summary;
```

Visual:

```text
Stacked bar chart
Category: target_system
Series: target_status
Value: propagation_count
```

Do not impose a `patient_id` filter on the aggregated Consent Summary datasets unless the serving views are later extended to include patient-level grain.

---

# 7. Filter Strategy

Recommended filters by dashboard:

```text
Glucose Management
  patient_id
  measure_date

CIO Executive
  metric_date
  metric_name
  readiness_status
  product_id

Platform Operations
  source_id
  domain
  freshness_status
  status
  severity

Patient and Consent
  alert_type
  alert status
  recipient_type
  sharing_status
  consent_scope
  current_state
  target_system
  target_status
```

Use global filters where the same field applies across the intended dashboard scope. Use page-level or widget-level filtering when a filter should not affect unrelated datasets.

---

# 8. Visual Standards

Use business-readable titles, for example:

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

Show units explicitly:

```text
glucose_mmol_l → mmol/L
percentage fields → %
duration_seconds → seconds
freshness_minutes → minutes
rto_hours / rpo_hours → hours
```

Keep the relevant date or timestamp visible for time-dependent KPI values.

Use semantic colors consistently, but do not rely on color alone. Keep text labels and legends visible.

---

# 9. Dashboard Validation

For every dashboard:

- [ ] All SQL datasets run successfully.
- [ ] No dataset has `TABLE_OR_VIEW_NOT_FOUND`.
- [ ] No dataset has `UNRESOLVED_COLUMN`.
- [ ] Filters behave as intended.
- [ ] Clearing filters produces a valid state.
- [ ] Single-value selection works.
- [ ] Chart titles are understandable without schema knowledge.
- [ ] Units are visible.
- [ ] Time context is visible.
- [ ] Synthetic non-production label is visible.
- [ ] No Regulatory or Compliance content appears in this release.
- [ ] Dashboard queries use the presentation serving contract.

For Glucose Management additionally verify:

- [ ] Patient selection affects relevant timeline and summary visuals.
- [ ] TIR/TBR/TAR values are valid percentages.
- [ ] TIR + TBR + TAR is within the agreed tolerance of 100%.
- [ ] Reading count is visible.
- [ ] `measure_date` is visible or explicitly filtered for KPI cards.
- [ ] `refreshed_at` is available in the summary detail.

---

# 10. Publish

When a dashboard passes the above checks:

1. Review all titles and descriptions.
2. Confirm the SQL Warehouse.
3. Confirm filters.
4. Confirm access permissions.
5. Confirm the synthetic-data notice.
6. Publish the dashboard.
7. Test the published dashboard with the intended viewer permissions.

Recommended published dashboard names:

```text
DCP - Glucose Management
DCP - CIO Executive
DCP - Platform Operations
DCP - Patient and Consent
```

---

# 11. Deployment and Git

From the repository root:

```bash
cd /Workspace/Repos/dcp/data-ai/diabetes_care_platform_demo

databricks bundle validate -t dev
```

If the dashboard resources are managed by the Databricks bundle, deploy after the dashboard configuration has been verified:

```bash
databricks bundle deploy -t dev
```

Review repository changes:

```bash
git status
git diff --stat
git diff
```

Then stage and review:

```bash
git add .
git diff --cached
```

Example commit:

```bash
git commit -m "Add DCP AI BI dashboards"
```

Push:

```bash
git push origin $(git branch --show-current)
```

---

# 12. Final Definition of Done

```text
DCP - Glucose Management       ✅
DCP - CIO Executive            ✅
DCP - Platform Operations      ✅
DCP - Patient and Consent      ✅
```

Serving contract:

```text
dcp_synth.04_presentation
```

Excluded from this release:

```text
Regulatory
Compliance
DP-15
DP-19
DP-21
```

Final release gate:

- [ ] All four dashboards open successfully.
- [ ] All datasets execute successfully.
- [ ] Filters behave correctly.
- [ ] Units and timestamps are visible.
- [ ] Glucose quality check passes.
- [ ] Synthetic-data notice is visible.
- [ ] Permissions are reviewed.
- [ ] Bundle validation passes if dashboards are bundle-managed.
- [ ] Changes are committed to Git.
