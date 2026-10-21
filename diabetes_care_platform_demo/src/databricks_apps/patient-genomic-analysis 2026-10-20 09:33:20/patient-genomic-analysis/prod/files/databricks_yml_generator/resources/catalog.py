"""
Convert overlay resources.catalogs entries with create: true into bundle
resources.catalogs. Shape follows assets/resources/catalog/source.yaml.
All overlay keys except special ones (create) are copied one-for-one to the bundle.
"""

# Keys we handle specially; all other overlay keys are copied through as-is.
_CATALOG_SPECIAL_KEYS = frozenset({"create"})


def build(overlay: dict) -> dict:
    """
    Build resources.catalogs for databricks.yml from overlay.
    Only includes entries where create is true (or omitted). Entries with
    create: false are turned into variables by main and are skipped here.
    Any overlay field not in _CATALOG_SPECIAL_KEYS is copied one-for-one.
    """
    catalogs = overlay.get("resources") or {}
    catalogs = catalogs.get("catalogs") or {}
    if not isinstance(catalogs, dict):
        return {}

    out = {}
    for key, spec in catalogs.items():
        if not isinstance(spec, dict):
            continue
        if spec.get("create") is False:
            continue
        # Defaults for required/common bundle fields; overlay overrides below
        resource = {
            "name": spec.get("name") or key,
            "comment": spec.get("comment", "Catalog created by Databricks Asset Bundles"),
            "options": spec.get("options", {}),
            "properties": spec.get("properties", {}),
            "lifecycle": spec.get("lifecycle", {"prevent_destroy": False}),
        }
        # Pass through all other overlay keys one-for-one (grants, connection_name, etc.)
        for k, v in spec.items():
            if k not in _CATALOG_SPECIAL_KEYS:
                resource[k] = v
        out[key] = resource

    return {"catalogs": out} if out else {}


def json_to_overlay(resources_data: dict) -> dict:
    """
    Build overlay resources.catalogs from outputs resources.json-style data.
    Returns a dict suitable for overlay["resources"]["catalogs"] (each with create: true).
    """
    catalogs = resources_data.get("catalogs") or {}
    if not isinstance(catalogs, dict):
        return {}
    out = {}
    for key, spec in catalogs.items():
        if isinstance(spec, dict):
            out[key] = {"name": spec.get("name") or key, "create": True}
    return out
