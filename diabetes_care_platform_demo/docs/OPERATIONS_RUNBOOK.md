# Incremental Operations Runbook

## Daily run
`databricks bundle run dcp_incremental_deployment -t dev`

## Monitor
Query `dcp_synth.09_test.v_incremental_run_health` and `v_incremental_manifest_summary`. Review Lakeflow pipeline event logs for backlog, schema evolution and failures.

## Failure handling
- Generator failure: keep failed run record; rerun with a new run_id.
- Bronze failure: repair pipeline update; do not delete checkpoints.
- Schema change: stop or quarantine until the contract version is approved.
- Duplicate key: block downstream release and investigate source/run replay.
- No-data run: pipeline should succeed without increasing business-row counts.

## Backfill
Create a new immutable run folder. Do not overwrite existing runs. Reconcile the manifest against Bronze after ingestion.

## Cutover
Require two successful incremental runs, one no-data run, full-versus-incremental reconciliation, security review, recovery drill, and performance evidence.
