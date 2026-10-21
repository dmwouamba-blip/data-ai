#!/usr/bin/env python3
"""
Generate databricks.yml from overlay. Loads overlays/{env}.yaml and writes
bundle name, target workspace (host, root_path), and variables to databricks.yml.
Per-resource conversion is in resources/ (added over time).
"""

import argparse
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML required: pip install pyyaml", file=sys.stderr)
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # optional: env vars can be set by shell

SCRIPT_DIR = Path(__file__).resolve().parent
BUNDLE_ROOT = SCRIPT_DIR.parent
OVERLAYS_DIR = BUNDLE_ROOT / "overlays"

# Ensure bundle root is on path so "from databricks_yml_generator.resources import ..." works
if str(BUNDLE_ROOT) not in sys.path:
    sys.path.insert(0, str(BUNDLE_ROOT))


def _load_env() -> None:
    """Load .env from bundle root (or copy/symlink of convert-to-dab .env)."""
    if load_dotenv is not None:
        load_dotenv(BUNDLE_ROOT / ".env")


def load_overlay(env: str) -> dict | None:
    """Load overlay YAML from overlays/{env}.yaml."""
    path = OVERLAYS_DIR / f"{env}.yaml"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


# Resource types with create: false become variables. Map overlay resource key -> (var_suffix, value_key, description).
_RESOURCE_VAR_MAP = {
    "apps": ("app_id", "name", "Default app"),
    "catalogs": ("catalog_id", "name", "Default catalog"),
    "schemas": ("schema_id", "name", "Default schema"),
    "sql_warehouses": ("warehouses_id", "id", "Default SQL warehouse"),
    "warehouses": ("warehouses_id", "id", "Default SQL warehouse"),
    "genie_rooms": ("genie_room_id", "id", "Genie space"),
}


def _variables_from_create_false_resources(overlay: dict) -> dict:
    """
    For any overlay.resources.<type>.<key> with create: false, add a variable
    (e.g. default_catalog_id) and return those variables. Such resources are
    not created by the bundle, so they are exposed as variables instead.
    """
    out = {}
    resources = overlay.get("resources") or {}
    for res_type, entries in resources.items():
        if not isinstance(entries, dict):
            continue
        suffix, value_key, desc_prefix = _RESOURCE_VAR_MAP.get(
            res_type, (res_type.rstrip("s") + "_id", "name", res_type.replace("_", " ").title())
        )
        for key, spec in entries.items():
            if not isinstance(spec, dict) or spec.get("create") is not False:
                continue
            value = spec.get(value_key) or spec.get("id") or spec.get("name")
            if value is None:
                continue
            var_name = f"{key}_{suffix}"
            out[var_name] = {"description": desc_prefix, "default": value}
    return out


def build_config(overlay: dict, env: str) -> dict:
    """
    Build databricks.yml from overlay. Converts host, name, root_path, variables
    (e.g. warehouse_ids) into bundle and target workspace and variables.
    Any resource with create: false is turned into a variable instead of a resource.
    Uses .env (BUNDLE_NAME, TARGET_WORKSPACE_URL, etc.) as fallback when overlay values are empty.
    """
    host = overlay.get("host") or os.getenv("TARGET_WORKSPACE_URL") or ""
    name = overlay.get("name") or os.getenv("BUNDLE_NAME") or ""
    root_path = overlay.get("root_path") or ""

    workspace = {"host": host}
    if root_path:
        workspace["root_path"] = root_path

    config = {
        "bundle": {"name": name},
        "sync": {"exclude": ["src/dashboards/**/*.lvdash.json"]},
        "targets": {
            env: {
                "mode": "production",
                "default": True,
                "workspace": workspace,
            }
        },
    }
    variables = dict(overlay.get("variables") or {})
    for var_name, var_spec in _variables_from_create_false_resources(overlay).items():
        variables[var_name] = var_spec
    if variables:
        config["variables"] = variables

    # Resources with create: true (e.g. catalogs, schemas) are built by resources/catalog etc.
    try:
        from databricks_yml_generator.resources import catalog as catalog_res
        catalog_fragment = catalog_res.build(overlay)
    except ImportError:
        catalog_fragment = {}
    if catalog_fragment:
        config.setdefault("resources", {}).update(catalog_fragment)
    try:
        from databricks_yml_generator.resources import schema as schema_res
        schema_fragment = schema_res.build(overlay)
    except ImportError:
        schema_fragment = {}
    if schema_fragment:
        config.setdefault("resources", {}).update(schema_fragment)
    try:
        from databricks_yml_generator.resources import app as app_res
        app_fragment = app_res.build(overlay)
    except ImportError:
        app_fragment = {}
    if app_fragment:
        config.setdefault("resources", {}).update(app_fragment)
    try:
        from databricks_yml_generator.resources import dashboard as dashboard_res
        dashboard_fragment = dashboard_res.build(overlay, BUNDLE_ROOT)
    except ImportError:
        dashboard_fragment = {}
    if dashboard_fragment:
        config.setdefault("resources", {}).update(dashboard_fragment)
    try:
        from databricks_yml_generator.resources import genie as genie_res
        genie_fragment = genie_res.build(overlay)
    except ImportError:
        genie_fragment = {}
    if genie_fragment:
        config.setdefault("resources", {}).update(genie_fragment)
    try:
        from databricks_yml_generator.resources import table as table_res
        table_fragment = table_res.build(overlay, BUNDLE_ROOT, target=env)
    except ImportError:
        table_fragment = {}
    if table_fragment:
        config.setdefault("resources", {}).update(table_fragment)

    return config


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate databricks.yml from overlay for env."
    )
    parser.add_argument(
        "--env",
        required=True,
        metavar="ENV",
        help="Environment name; loads overlays/{ENV}.yaml (e.g. sandbox)",
    )
    args = parser.parse_args()

    _load_env()
    overlay = load_overlay(args.env)
    if overlay is None:
        print(
            f"Overlay not found: {OVERLAYS_DIR / f'{args.env}.yaml'}",
            file=sys.stderr,
        )
        sys.exit(1)

    config = build_config(overlay, args.env)
    out_path = BUNDLE_ROOT / "databricks.yml"
    with open(out_path, "w", encoding="utf-8") as f:
        yaml.dump(
            config,
            f,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            width=1000,
        )
        f.write("\n")
    print(f"Wrote {out_path} (env={args.env})", file=sys.stderr)


if __name__ == "__main__":
    main()
