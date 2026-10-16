# Incremental Test Runbook

## Standard execution

```bash
databricks bundle validate -t dev
databricks bundle deploy -t dev
databricks bundle run dcp_incremental_test_suite -t dev
```

## Failure triage

1. `preflight_and_baseline`: install foundation, close active generator run, remove duplicate state keys.
2. `run_incremental_deployment`: inspect the child job and Lakeflow pipeline event logs.
3. `resolve_and_assert_run`: inspect `generator_runs`, `generator_manifest`, and output paths.
4. `manifest_to_bronze`: compare `_run_id` counts and source formats/schemas.
5. `data_contracts`: inspect duplicates, null keys and quality domains.
6. `assert_no_data_idempotency`: verify no generator or external writer ran during the no-data test.
7. `registry_integrity`: repair duplicates only through an approved migration.

## Isolation requirement

Do not run the suite concurrently with scheduled incremental generation. The test requires one generated run after the captured test start and a quiet window for the no-data rerun.

## Reconciliation interpretation

`v_incremental_full_cgm_reconciliation` is informational unless both paths cover precisely the same source horizon. Zero differences are required only during a controlled parity test.
