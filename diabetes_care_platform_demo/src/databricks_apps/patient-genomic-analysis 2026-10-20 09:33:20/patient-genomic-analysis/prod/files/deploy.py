#!/usr/bin/env python3
"""
Deploy bundle: generate, validate, deploy, then optionally create_tables and run each app.
Invoke from convert-to-dab: uv run deploy-bundle --profile <profile> --env <env>
"""
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

BUNDLE_ROOT = Path(__file__).resolve().parent
BUNDLE_ENGINE = "DATABRICKS_BUNDLE_ENGINE=direct"


def _run(cmd: list[str], env: dict | None = None) -> int:
    e = {**os.environ, **(env or {})}
    if "DATABRICKS_BUNDLE_ENGINE" not in e:
        e["DATABRICKS_BUNDLE_ENGINE"] = "direct"
    return subprocess.run(cmd, cwd=BUNDLE_ROOT, env=e).returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate, validate, deploy, then run create_tables (if tables) and each app.")
    parser.add_argument("--profile", required=True, help="Databricks CLI profile (e.g. dev).")
    parser.add_argument("--env", required=True, help="Overlay env (e.g. sandbox).")
    args = parser.parse_args()

    # 1. generate
    if _run(["uv", "run", "generate", "--env", args.env]) != 0:
        return 1
    # 2. validate – only proceed if this succeeds
    if _run(["databricks", "bundle", "validate"]) != 0:
        return 1
    # 3. deploy (only reached when validate succeeded)
    if _run(["databricks", "bundle", "deploy", "--profile", args.profile]) != 0:
        return 1

    # Load overlay to decide create_tables and which apps to run
    overlay_path = BUNDLE_ROOT / "overlays" / f"{args.env}.yaml"
    if not overlay_path.exists():
        return 0
    try:
        import yaml
        overlay = yaml.safe_load(overlay_path.read_text(encoding="utf-8")) or {}
    except Exception as e:
        print(f"Warning: could not load overlay: {e}", file=sys.stderr)
        return 0
    resources = overlay.get("resources") or {}
    tables = resources.get("tables") or {}
    apps = resources.get("apps") or {}
    genie_rooms = resources.get("genie_rooms") or {}

    # 4. create_tables only if overlay has table objects
    if isinstance(tables, dict) and tables:
        if _run(["databricks", "bundle", "run", "create_tables", "--profile", args.profile]) != 0:
            return 1

    # 5. Run each application in the overlay
    if isinstance(apps, dict):
        for app_key in apps:
            if _run(["databricks", "bundle", "run", app_key, "--profile", args.profile]) != 0:
                return 1

    # 6. Set GENIE_SPACE_ID env var on each app if genie rooms exist
    if isinstance(genie_rooms, dict) and isinstance(apps, dict) and genie_rooms:
        genie_id = None
        for gk, gspec in genie_rooms.items():
            if isinstance(gspec, dict) and gspec.get("id"):
                genie_id = gspec["id"]
                break
        if genie_id:
            for app_key, app_spec in apps.items():
                if not isinstance(app_spec, dict):
                    continue
                app_name = app_spec.get("name") or app_key
                print(f"Setting GENIE_SPACE_ID={genie_id} on app {app_name}", file=sys.stderr)
                env_payload = json.dumps({"env": [{"name": "GENIE_SPACE_ID", "value": genie_id}]})
                _run([
                    "databricks", "apps", "update-env", app_name,
                    "--json", env_payload,
                    "--profile", args.profile,
                ])

    return 0


if __name__ == "__main__":
    sys.exit(main())
