"""
Convert overlay resources.tables into a create_tables job and generate CREATE TABLE SQL in code.
Tables come from resources.json (catalogs -> schemas -> tables). Each table gets one job task
running a SQL file; the SQL is built from data_map (column, type, comment) in this file, no template.
"""

from pathlib import Path

JOB_KEY = "create_tables"
JOB_NAME = "create_tables"
WAREHOUSE_VAR = "${var.default_warehouse}"
SQL_DIR = "src/tables"
# Path key prefix for job file paths: src/tables/table_one/create.sql, table_two, ...
TABLE_PATH_PREFIX = "table_"
DEFAULT_TABLE_COMMENT = "Table created by bundle"


def _path_key(index: int) -> str:
    """Ordered key for paths: table_one, table_two, table_three, table_four, ..."""
    ones = ("one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten")
    if index < len(ones):
        return f"{TABLE_PATH_PREFIX}{ones[index]}"
    return f"{TABLE_PATH_PREFIX}{index + 1}"


def _normalize_type(type_val: str) -> str:
    """Strip ColumnTypeName. prefix so STRING, DOUBLE, TIMESTAMP are valid SQL types."""
    if not type_val:
        return "STRING"
    s = str(type_val).strip()
    if s.upper().startswith("COLUMNTYPENAME."):
        return s[15:].strip()
    return s


def _resolve_full_name(overlay: dict, spec: dict) -> str:
    """
    Resolve table full_name from overlay refs: catalog_ref -> catalogs[key].name,
    schema_ref -> schemas[key].name, then spec.name.
    e.g. main.field_learning_enablement.accredible_credentials
    -> fevm_sandbox_tnx9iv.field_learning_enablement.accredible_credentials
    """
    resources = overlay.get("resources") or {}
    catalogs = resources.get("catalogs") or {}
    schemas = resources.get("schemas") or {}
    catalog_ref = spec.get("catalog_ref") or ""
    schema_ref = spec.get("schema_ref") or ""
    table_name = spec.get("name") or ""
    catalog_name = (catalogs.get(catalog_ref) or {}).get("name") or catalog_ref
    schema_name = (schemas.get(schema_ref) or {}).get("name") or schema_ref
    return f"{catalog_name}.{schema_name}.{table_name}"


def _workspace_parquet_path(workspace_bundle_root: str, relative_parquet_path: str) -> str:
    """
    Build the workspace path where the bundle's parquet file is deployed.
    DAB syncs bundle files under {workspace_bundle_root}/files/{path_from_bundle_root}.
    e.g. /Workspace/Users/user@databricks.com/.bundle/my-bundle/sandbox/files/src/data/parquet/table.parquet
    """
    root = (workspace_bundle_root or "").rstrip("/")
    rel = (relative_parquet_path or "").lstrip("/")
    return f"{root}/files/{rel}" if root and rel else f"{root}/{rel}" if root else rel


def _build_convert_to_delta_sql(workspace_bundle_root: str, relative_parquet_path: str, full_table_name: str) -> str:
    """Generate SQL: CONVERT TO DELTA parquet at workspace path, then CREATE TABLE USING DELTA LOCATION.
    Path is built from workspace_bundle_root (resolved root_path) + /files/ + relative_parquet_path (e.g. src/data/parquet/name.parquet).
    """
    full_parquet_path = _workspace_parquet_path(workspace_bundle_root, relative_parquet_path)
    # Escape backticks in path for parquet.`path`; single quotes for LOCATION 'path'
    path_escaped_bt = full_parquet_path.replace("\\", "\\\\").replace("`", "\\`")
    path_escaped_sq = full_parquet_path.replace("\\", "\\\\").replace("'", "''")
    return f"""-- Generated: convert parquet to Delta and register table {full_table_name}
CONVERT TO DELTA parquet.`{path_escaped_bt}`;

CREATE OR REPLACE TABLE {full_table_name}
USING DELTA
LOCATION '{path_escaped_sq}';
"""


def _build_create_table_sql(qualified_name: str, table_comment: str, data_map: list[dict]) -> str:
    """Build full CREATE TABLE IF NOT EXISTS ... (col type COMMENT '...', ...) COMMENT '...' in code."""
    comment_escaped = (table_comment or "").replace("'", "''")
    lines = []
    for col_spec in data_map or []:
        col = col_spec.get("column") or col_spec.get("name") or ""
        type_str = _normalize_type(col_spec.get("type") or "STRING")
        col_comment = (col_spec.get("comment") or "").replace("'", "''")
        if col_comment:
            lines.append(f"  {col} {type_str} COMMENT '{col_comment}'")
        else:
            lines.append(f"  {col} {type_str}")
    body = ",\n".join(lines) if lines else "  _placeholder STRING  -- no data_map"
    return (
        f"CREATE TABLE IF NOT EXISTS {qualified_name} (\n"
        f"{body}\n"
        f") COMMENT '{comment_escaped}';\n"
    )


def json_to_overlay(resources_data: dict) -> dict:
    """
    Build overlay resources.tables from outputs resources.json-style data.
    Converts full_name (catalog.schema.table) into catalog_ref, schema_ref, and name; full_name
    is not stored and is recomputed in build() from overlay catalogs/schemas.
    Returns a dict suitable for overlay["resources"]["tables"]: keys = table_one, table_two, ...
    value = { name, catalog_ref, schema_ref, data_map, create: True }.
    """
    catalogs = resources_data.get("catalogs") or {}
    if not isinstance(catalogs, dict):
        return {}
    ordered_tables: list[dict] = []
    for _cat_key, cat_spec in catalogs.items():
        if not isinstance(cat_spec, dict):
            continue
        for _sch_key, sch_spec in (cat_spec.get("schemas") or {}).items():
            if not isinstance(sch_spec, dict):
                continue
            catalog_ref = sch_spec.get("catalog_ref") or _cat_key
            schema_ref = sch_spec.get("schema_ref") or _sch_key
            for tbl in sch_spec.get("tables") or []:
                if not isinstance(tbl, dict) or not tbl.get("name"):
                    continue
                full_name = tbl.get("full_name")
                if full_name and isinstance(full_name, str):
                    parts = full_name.split(".")
                    if len(parts) == 3:
                        catalog_ref, schema_ref = parts[0], parts[1]
                        # name stays from tbl["name"] for the table's own name
                ordered_tables.append({
                    "name": tbl["name"],
                    "catalog_ref": catalog_ref,
                    "schema_ref": schema_ref,
                    "comment": tbl.get("comment") or DEFAULT_TABLE_COMMENT,
                    "create": True,
                    "data_map": tbl.get("data_map") or [],
                })
    return {_path_key(i): spec for i, spec in enumerate(ordered_tables)}


def build(overlay: dict, bundle_root: Path | None = None, target: str | None = None) -> dict:
    """
    Build resources.jobs.create_tables from overlay.resources.tables.
    For each table with create: true, generate CREATE TABLE SQL from data_map in code (no template),
    write src/tables/{key}/create.sql, and add one sql_task per table.
    When target is set, root_path placeholders ${bundle.name} and ${bundle.target} are resolved for CONVERT TO DELTA.
    Returns {"jobs": {"create_tables": { name, tasks }}} or {}.
    """
    resources = overlay.get("resources") or {}
    tables = resources.get("tables") or {}
    if not isinstance(tables, dict):
        return {}

    to_create = [
        (key, spec)
        for key, spec in tables.items()
        if isinstance(spec, dict) and spec.get("create") is not False and spec.get("name")
    ]
    if not to_create:
        return {}

    # Resolve bundle_root_path for CONVERT TO DELTA (path inlined in SQL; resolve ${bundle.name} and ${bundle.target})
    bundle_root_path = overlay.get("root_path") or "${var.bundle_root_path}"
    if not bundle_root_path.strip().startswith("${var."):
        bundle_root_path = bundle_root_path.rstrip("/")
    if target is not None:
        bundle_root_path = bundle_root_path.replace("${bundle.target}", target)
    if bundle_root is not None:
        bundle_root_path = bundle_root_path.replace("${bundle.name}", Path(bundle_root).name)

    if bundle_root:
        bundle_root = Path(bundle_root).resolve()
        tables_dir = bundle_root / SQL_DIR
        parquet_dir = bundle_root / "src" / "data" / "parquet"
        for key, spec in to_create:
            full_name = _resolve_full_name(overlay, spec) or spec.get("full_name") or ""
            table_comment = spec.get("comment") or DEFAULT_TABLE_COMMENT
            data_map = spec.get("data_map") or []
            parquet_path = spec.get("table_data_path")
            # If overlay has no table_data_path but parquet exists in bundle, use it so we generate convert.sql
            table_name = spec.get("name") or key
            if not parquet_path and table_name and parquet_dir.is_dir():
                candidate = parquet_dir / f"{table_name}.parquet"
                if candidate.is_file():
                    parquet_path = f"src/data/parquet/{table_name}.parquet"
            if parquet_path and full_name:
                # Table with data: write convert.sql (workspace path built from root_path + /files/ + table_data_path)
                table_dir = tables_dir / key
                table_dir.mkdir(parents=True, exist_ok=True)
                convert_sql = _build_convert_to_delta_sql(bundle_root_path, parquet_path, full_name)
                (table_dir / "convert.sql").write_text(
                    "-- Generated from overlay.\n\n" + convert_sql,
                    encoding="utf-8",
                )
            else:
                # Table without data: write create.sql (CREATE TABLE with schema)
                create_sql = _build_create_table_sql(full_name, table_comment, data_map)
                table_dir = tables_dir / key
                table_dir.mkdir(parents=True, exist_ok=True)
                (table_dir / "create.sql").write_text(
                    "-- Generated from overlay.\n\n" + create_sql,
                    encoding="utf-8",
                )

    tasks = []
    parquet_dir = Path(bundle_root).resolve() / "src" / "data" / "parquet" if bundle_root else None
    for key, spec in to_create:
        table_name = spec.get("name") or key
        parquet_path = spec.get("table_data_path")
        if not parquet_path and table_name and parquet_dir and parquet_dir.is_dir():
            if (parquet_dir / f"{table_name}.parquet").is_file():
                parquet_path = f"src/data/parquet/{table_name}.parquet"
        if parquet_path and spec.get("name"):
            full_name = _resolve_full_name(overlay, spec) or ""
            if full_name:
                # SQL task: CONVERT TO DELTA + CREATE TABLE USING DELTA LOCATION (path inlined in convert.sql)
                tasks.append({
                    "task_key": table_name,
                    "sql_task": {
                        "warehouse_id": WAREHOUSE_VAR,
                        "file": {"path": f"{SQL_DIR}/{key}/convert.sql"},
                    },
                })
                continue
        # SQL task: CREATE TABLE with schema
        tasks.append({
            "task_key": table_name,
            "sql_task": {
                "warehouse_id": WAREHOUSE_VAR,
                "file": {"path": f"{SQL_DIR}/{key}/create.sql"},
            },
        })

    return {
        "jobs": {
            JOB_KEY: {
                "name": JOB_NAME,
                "tasks": tasks,
            }
        }
    }
