# Deployment

1. Copy the package into the existing bundle root.
2. Ensure `include: - resources/*.yml` is present.
3. Ensure `sql_warehouse_id` is configured.
4. Run foundation once.
5. Deploy and run the incremental job.

```bash
databricks bundle validate -t dev
databricks bundle summary -t dev
databricks bundle deploy -t dev
databricks bundle run dcp_incremental_foundation -t dev
databricks bundle run dcp_incremental_deployment -t dev
```

Rollback code by redeploying a known-good Git tag. For data, retain the separate full-refresh path and back up before any destructive rebuild.
