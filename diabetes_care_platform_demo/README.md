# DCP Synthetic Lakehouse Deployment Bundle

A governed, landing-first Databricks Lakehouse implementation using:

- Databricks Asset Bundles
- Unity Catalog
- Lakeflow Pipelines
- Medallion Architecture
- Synthetic Healthcare Data

This package demonstrates healthcare, consent, compliance, regulatory, operational, and dashboard data products using deterministic synthetic datasets.

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
Validation
```

---

## Pipeline Architecture

The platform is implemented with four Lakeflow Pipelines:

```text
dcp_bronze_pipeline
      ↓
dcp_silver_pipeline
      ↓
dcp_gold_pipeline
      ↓
dcp_dashboard_pipeline
```

### Bronze Pipeline

Creates:

```text
01_bronze.patient_master
01_bronze.cgm_readings
01_bronze.consent_events
01_bronze.device_events
01_bronze.consent_propagation
```

and dashboard-support datasets.

### Silver Pipeline

Creates canonical datasets:

```text
02_silver.patient
02_silver.glucose_readings
02_silver.consent_events
02_silver.device_status
```

### Gold Pipeline

Creates governed data products:

```text
DP-01 Patient Glucose Timeline
DP-02 Patient Glucose Summary
DP-09 Patient Device Status
DP-10 Patient Consent Current State
DP-11 Consent Propagation Status
```

### Dashboard Pipeline

Creates presentation datasets:

```text
vw_patient_glucose_summary
vw_patient_consent_current
vw_consent_propagation_summary
vw_cio_service_trend
vw_platform_source_health
```

---

## Prerequisites

- Unity Catalog-enabled Databricks workspace
- Lakeflow Pipelines enabled
- Existing SQL Warehouse
- Existing Cluster for source-data generation and validation
- Databricks CLI authenticated

Required variables:

```yaml
sql_warehouse_id
existing_cluster_id
catalog_name
```

Default catalog:

```yaml
dcp_synth
```

---

## Repository

```text
resources/
├── dcp_full_deployment.yml
├── dcp_pipelines.yml
└── dcp_pipeline_job.yml

src/
├── setup/
├── notebooks/
├── sql/
└── pipelines/
    ├── bronze_pipeline.py
    ├── silver_pipeline.py
    ├── gold_pipeline.py
    └── dashboard_pipeline.py
```

---

## Validate and Deploy

Validate:

```bash
databricks bundle validate -t dev
```

Deploy:

```bash
databricks bundle deploy -t dev
```

---

## Run Complete Platform

Runs:

```text
generate_healthcare
generate_domain
generate_dashboard_data
dcp_bronze_pipeline
dcp_silver_pipeline
dcp_gold_pipeline
dcp_dashboard_pipeline
validate
```

Execute:

```bash
databricks bundle run dcp_lakeflow_deployment -t dev
```

---

## Run Individual Pipelines

Bronze:

```bash
databricks bundle run dcp_bronze_pipeline -t dev
```

Silver:

```bash
databricks bundle run dcp_silver_pipeline -t dev
```

Gold:

```bash
databricks bundle run dcp_gold_pipeline -t dev
```

Dashboard:

```bash
databricks bundle run dcp_dashboard_pipeline -t dev
```

---

## Operational Properties

The pipelines are configured with:

```yaml
serverless: true
continuous: false
photon: true
channel: CURRENT
```

and include:

- Auto Loader ingestion
- Expectations
- Deduplication
- Data quality controls
- Retry handling
- Failure notifications
- Unity Catalog governance

---

## Safety Boundary

This platform contains:

```text
Synthetic healthcare data only
```

for:

- Demonstrations
- Proof of concepts
- Engineering validation
- Training

It is not approved for production healthcare workloads.

---

## Rollback

For development environments:

```bash
databricks bundle destroy -t dev
```

or rerun:

```bash
databricks bundle run dcp_lakeflow_deployment -t dev
```

after corrective changes.

For controlled environments, use:

- Delta cloning
- Snapshot retention
- Environment-specific recovery procedures

---

## Command Summary

### Open the Databricks CLI

Use `tools/DCP_Bundle_Deploy_Helper_Notebook.py` to open the Databricks Web Terminal and follow the deployment instructions.

### Validate

```bash
databricks bundle validate -t dev
```

### Deploy

```bash
databricks bundle deploy -t dev
```

### Run Lakeflow Deployment

```bash
databricks bundle run dcp_lakeflow_deployment -t dev
```

### Open Deployed Resources

```bash
databricks bundle summary -t dev
```

### Available Pipelines

```text
dcp_bronze_pipeline
dcp_silver_pipeline
dcp_gold_pipeline
dcp_dashboard_pipeline
```

### Optional: Run Individual Pipelines

```bash
databricks bundle run dcp_bronze_pipeline -t dev
databricks bundle run dcp_silver_pipeline -t dev
databricks bundle run dcp_gold_pipeline -t dev
databricks bundle run dcp_dashboard_pipeline -t dev
```