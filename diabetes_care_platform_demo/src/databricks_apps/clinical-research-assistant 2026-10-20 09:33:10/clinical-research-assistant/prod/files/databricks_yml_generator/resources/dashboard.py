"""
Convert overlay resources.dashboards into bundle resources.dashboards.
Special key: warehouse_ref → warehouse_id: ${var.<warehouse_ref>} (e.g. default_warehouse).
All other overlay keys (display_name, file_path, etc.) are copied as-is.
"""

import json
import re
import shutil
from pathlib import Path

# Keys we handle specially; not copied to bundle (warehouse_ref → warehouse_id; template_map → substituted into file; name → becomes the resource key).
_DASHBOARD_SPECIAL_KEYS = frozenset({"warehouse_ref", "template_map", "name"})


def _sanitize_key(s: str) -> str:
    """Sanitize a string to be a valid DAB resource key (alphanumeric, hyphens, underscores)."""
    s = re.sub(r'[\[\](){}]', '', s)  # strip brackets/parens
    s = re.sub(r'[^a-zA-Z0-9_-]', '-', s)  # replace invalid chars with hyphens
    s = re.sub(r'-+', '-', s).strip('-')  # collapse multiple hyphens
    return s or 'unnamed'


def _resolve_template_map(overlay: dict, template_map: dict) -> dict:
    """
    Resolve template_map refs to actual resource names using overlay.
    catalog_1: demos_genie → catalogs.demos_genie.name; schema_1: fins_cap_markets_risk → schemas[...].name; tables as-is.
    """
    resources = overlay.get("resources") or {}
    catalogs = resources.get("catalogs") or {}
    schemas = resources.get("schemas") or {}
    resolved = {}
    for key, ref in (template_map or {}).items():
        if not isinstance(ref, str):
            resolved[key] = ref
            continue
        if key.startswith("catalog") and ref in catalogs and isinstance(catalogs.get(ref), dict):
            resolved[key] = catalogs[ref].get("name", ref)
        elif key.startswith("schema") and ref in schemas and isinstance(schemas.get(ref), dict):
            resolved[key] = schemas[ref].get("name", ref)
        else:
            resolved[key] = ref
    return resolved


def _substitute_dashboard_template(
    template_path: Path, output_path: Path, resolved_map: dict
) -> None:
    """Read template JSON, substitute ${key} with resolved_map[key] in content, write to output_path."""
    content = template_path.read_text(encoding="utf-8")
    for key, value in resolved_map.items():
        content = content.replace("${" + key + "}", str(value))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")


def build(overlay: dict, bundle_root: Path | None = None) -> dict:
    """
    Build resources.dashboards for databricks.yml from overlay.
    - warehouse_ref → warehouse_id using variable for that warehouse.
    - template_map is omitted from bundle; when bundle_root is set, resolve refs from overlay,
      find each dashboard's template.lvdash.json, substitute ${catalog_1} etc. with resolved names,
      write dashboard.lvdash.json.
    """
    resources = overlay.get("resources") or {}
    dashboards = resources.get("dashboards") or {}
    if not isinstance(dashboards, dict):
        return {}

    out = {}
    for key, spec in dashboards.items():
        if not isinstance(spec, dict):
            continue
        resource = {}
        warehouse_ref = spec.get("warehouse_ref")
        if warehouse_ref:
            resource["warehouse_id"] = "${var." + warehouse_ref + "}"
        for k, v in spec.items():
            if k not in _DASHBOARD_SPECIAL_KEYS:
                resource[k] = v
        # Bundle key is dashboard name (e.g. cap-markets-risk-dais-app-dashboard), not overlay key
        dashboard_name = _sanitize_key(spec.get("name") or key)
        out[dashboard_name] = resource

    if bundle_root:
        bundle_root = Path(bundle_root).resolve()
        dashboards_base = bundle_root / "src" / "dashboards"
        for dash_key, spec in dashboards.items():
            if not isinstance(spec, dict):
                continue
            template_map = spec.get("template_map")
            if not template_map or not isinstance(template_map, dict):
                continue
            file_path = spec.get("file_path") or ""
            # file_path like src/dashboards/cap-markets-risk-dais-app-dashboard/dashboard.lvdash.json
            if "/" not in file_path or not file_path.endswith(".json"):
                continue
            dir_from_path = file_path.rsplit("/", 1)[0]
            dashboard_dir = bundle_root / dir_from_path
            template_file = dashboard_dir / "template.lvdash.json"
            if not template_file.is_file():
                # Fallback: overlay may use display name with spaces; folder may be hyphenated (e.g. PSA-Team-Champions-Tracker)
                dir_segment = dir_from_path.split("/")[-1] if "/" in dir_from_path else dir_from_path
                normalized_dir = dir_segment.replace(" ", "-")
                if normalized_dir != dir_segment:
                    alt_dir = dashboards_base / normalized_dir
                    alt_template = alt_dir / "template.lvdash.json"
                    if alt_template.is_file():
                        dashboard_dir = alt_dir
                        template_file = alt_template
                        dashboard_name = spec.get("name") or dash_key
                        alt_file_path = f"src/dashboards/{normalized_dir}/dashboard.lvdash.json"
                        if dashboard_name in out:
                            out[dashboard_name]["file_path"] = alt_file_path
            if not template_file.is_file():
                continue
            resolved = _resolve_template_map(overlay, template_map)
            _substitute_dashboard_template(
                template_file,
                dashboard_dir / "dashboard.lvdash.json",
                resolved,
            )

    return {"dashboards": out} if out else {}


def _to_snake_case(s: str) -> str:
    """Convert kebab-case or mixed to snake_case for overlay key."""
    return s.replace("-", "_")


def json_to_overlay(resources_data: dict, outputs_dir: Path | None = None) -> dict:
    """
    Build overlay resources.dashboards from outputs resources.json (dashboards key).
    Overlay key is snake_case (e.g. cap_markets_risk_dais_app_dashboard).
    Each entry gets display_name (from name), file_path (src/dashboards/<name>/dashboard.lvdash.json), warehouse_ref: default.
    When outputs_dir is set, template_map is loaded from outputs_dir/dashboard/<key>/map.json if present.
    Other keys from resources_data are passed through.
    """
    dashboards = resources_data.get("dashboards") or {}
    if not isinstance(dashboards, dict):
        return {}
    out = {}
    for key, spec in dashboards.items():
        if not isinstance(spec, dict):
            continue
        name = spec.get("name") or key
        overlay_key = _to_snake_case(key)
        display_name = spec.get("display_name") or name.replace("-", " ").replace("_", " ").title()
        entry = {
            "display_name": display_name,
            "file_path": f"src/dashboards/{name}/dashboard.lvdash.json",
            "warehouse_ref": "default_warehouse",
        }
        if outputs_dir:
            map_path = Path(outputs_dir) / "dashboard" / key / "map.json"
            if map_path.is_file():
                try:
                    entry["template_map"] = json.loads(map_path.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError):
                    pass
        if not entry.get("template_map") and isinstance(spec.get("template_map"), dict):
            entry["template_map"] = spec["template_map"]
        for k, v in spec.items():
            if k not in ("warehouse_ref", "template_map", "id"):
                entry[k] = v
        out[overlay_key] = entry
    return out


def copy_dashboard(outputs_dir: Path, bundle_root: Path) -> None:
    """
    Copy template.lvdash.json from each outputs_dir/dashboard/<name>/ into
    bundle_root/src/dashboards/<name>/dashboard.lvdash.json.
    Only template.lvdash.json is copied (map.json is used by json_to_overlay only).
    """
    outputs_dir = Path(outputs_dir).resolve()
    bundle_root = Path(bundle_root).resolve()
    src = outputs_dir / "dashboard"
    dst = bundle_root / "src" / "dashboards"
    if not src.is_dir():
        return
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        if not item.is_dir():
            continue
        template = item / "template.lvdash.json"
        if not template.is_file():
            continue
        dest_sub = dst / item.name
        dest_sub.mkdir(parents=True, exist_ok=True)
        shutil.copy2(template, dest_sub / "template.lvdash.json")
