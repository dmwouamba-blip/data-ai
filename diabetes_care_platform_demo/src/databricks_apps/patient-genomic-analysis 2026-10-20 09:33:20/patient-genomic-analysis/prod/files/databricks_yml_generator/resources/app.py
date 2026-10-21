"""
Convert overlay resources.apps entries with create: true into bundle
resources.apps. The overlay key is the uid (e.g. my_app); other resources
reference it via app_ref: <uid>. Shape follows assets/resources/app/source.yaml.
All overlay keys except special ones (create) are copied one-for-one to the bundle.
"""

import shutil
from pathlib import Path

# Keys we handle specially; all other overlay keys are copied through as-is.
_APP_SPECIAL_KEYS = frozenset({"create"})


def build(overlay: dict) -> dict:
    """
    Build resources.apps for databricks.yml from overlay.
    Only includes entries where create is true (or omitted). Entries with
    create: false are turned into variables by main and are skipped here.
    The overlay key is the app uid (e.g. my_app); reference elsewhere via app_ref: <uid>.
    Any overlay field not in _APP_SPECIAL_KEYS is copied one-for-one.
    """
    resources = overlay.get("resources") or {}
    apps = resources.get("apps") or {}
    if not isinstance(apps, dict):
        return {}

    out = {}
    for key, spec in apps.items():
        if not isinstance(spec, dict):
            continue
        if spec.get("create") is False:
            continue
        # Order: name first, then source_code_path, then everything else
        resource = {}
        resource["name"] = spec.get("name") or key
        resource["source_code_path"] = spec.get("source_code_path") or f"./src/{key}"
        for k, v in spec.items():
            if k not in _APP_SPECIAL_KEYS and k not in ("name", "source_code_path"):
                resource[k] = v
        out[key] = resource

    return {"apps": out} if out else {}


def json_to_overlay(resources_data: dict) -> dict:
    """
    Build overlay resources.apps from outputs resources.json-style data (applications key).
    Each app gets create: true and source_code_path: ./src/<app_key> (after copy_app_code).
    Other keys (e.g. resources) are passed through; code_path is not written (use source_code_path).
    If resources_data contains genie_rooms, injects genie_space permission into each app's resources.
    """
    applications = resources_data.get("applications") or {}
    if not isinstance(applications, dict):
        return {}

    # Collect genie room IDs for app permission injection
    genie_rooms = resources_data.get("genie_rooms") or {}
    genie_ids = []
    for gk, gspec in genie_rooms.items():
        if isinstance(gspec, dict) and gspec.get("id"):
            genie_ids.append(gspec["id"])

    out = {}
    for key, spec in applications.items():
        if not isinstance(spec, dict):
            continue
        entry = {}
        for k, v in spec.items():
            if k not in ("create", "code_path"):  # code_path is absolute; we use source_code_path
                entry[k] = v
        entry["name"] = spec.get("name") or key
        entry["source_code_path"] = f"./src/{key}"
        entry["create"] = True

        # Inject genie_space permission for each genie room
        if genie_ids:
            app_resources = entry.setdefault("resources", [])
            for genie_id in genie_ids:
                app_resources.append({
                    "name": "genie-space",
                    "genie_space": {
                        "id": genie_id,
                        "permission": "CAN_RUN",
                    },
                })

        out[key] = entry
    return out


def copy_app_code(outputs_dir: Path, bundle_root: Path) -> None:
    """
    Copy the application folder at outputs_dir/application into bundle_root/src.
    So outputs_dir/application/<app_name> becomes bundle_root/src/<app_name>.
    """
    outputs_dir = Path(outputs_dir).resolve()
    bundle_root = Path(bundle_root).resolve()
    src = outputs_dir / "application"
    dst = bundle_root / "src"
    if not src.is_dir():
        return
    dst.mkdir(parents=True, exist_ok=True)
    for item in src.iterdir():
        dest_item = dst / item.name
        if item.is_dir():
            shutil.copytree(item, dest_item, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest_item)
