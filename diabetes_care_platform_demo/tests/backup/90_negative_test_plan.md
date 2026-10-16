# Manual negative tests

Run only in an isolated development catalog.

## Missing source
1. Add one nonexistent source object to `backup_object_config`.
2. Run `create_validate_backup.py`.
3. Expect the set to become `FAILED` and the wrapper not to start full refresh.
4. Restore the configuration.

## Empty configuration
1. Temporarily disable all configuration rows.
2. Run the notebook.
3. Expect `No enabled backup objects are configured`.
4. Restore configuration.

## Duplicate source
1. Insert a duplicate enabled source row.
2. Run the notebook.
3. Expect a precondition failure before a backup set is registered.
4. Remove the duplicate.

## Retention
1. Create three successful guarded-refresh backups in an isolated environment.
2. Run `apply_retention.py` only after full-refresh validation passes.
3. Verify exactly two active validated sets remain.
4. Verify older clone tables are absent and registry history remains `DELETED`.
