"""
Convert overlay resources.schemas entries with create: true into bundle
resources.schemas. Shape follows assets/resources/schema/source.yaml.
Entries with create: false become variables (handled in main).
All overlay keys except special ones (create, catalog_ref) are copied one-for-one.
"""

# Keys we handle specially; catalog_ref becomes catalog_name; all others copied as-is.
_SCHEMA_SPECIAL_KEYS = frozenset({"create", "catalog_ref"})


def _catalog_name_ref(overlay: dict, catalog_ref: str) -> str:
    """Resolve catalog_ref to bundle catalog_name (var or resources reference)."""
    catalogs = (overlay.get("resources") or {}).get("catalogs") or {}
    cat_spec = catalogs.get(catalog_ref) if isinstance(catalogs, dict) else None
    if isinstance(cat_spec, dict) and cat_spec.get("create") is False:
        return "${var." + f"{catalog_ref}_catalog_id" + "}"
    return "${resources.catalogs." + catalog_ref + ".name}"


def build(overlay: dict) -> dict:
    """
    Build resources.schemas for databricks.yml from overlay.
    Only includes entries where create is true (or omitted). Entries with
    create: false are turned into variables by main and are skipped here.
    Any overlay field not in _SCHEMA_SPECIAL_KEYS is copied one-for-one.
    """
    resources = overlay.get("resources") or {}
    schemas = resources.get("schemas") or {}
    if not isinstance(schemas, dict):
        return {}

    out = {}
    for key, spec in schemas.items():
        if not isinstance(spec, dict):
            continue
        if spec.get("create") is False:
            continue
        catalog_ref = spec.get("catalog_ref")
        if not catalog_ref:
            continue
        catalog_name = _catalog_name_ref(overlay, catalog_ref)
        # Defaults for required/common bundle fields; overlay overrides below
        resource = {
            "name": spec.get("name") or key,
            "catalog_name": catalog_name,
            "comment": spec.get("comment", "Schema created by Databricks Asset Bundles"),
            "properties": spec.get("properties", {}),
            "lifecycle": spec.get("lifecycle", {"prevent_destroy": False}),
        }
        # Pass through all other overlay keys one-for-one (grants, storage_root, etc.)
        for k, v in spec.items():
            if k not in _SCHEMA_SPECIAL_KEYS:
                resource[k] = v
        out[key] = resource

    return {"schemas": out} if out else {}


def json_to_overlay(resources_data: dict) -> dict:
    """
    Build overlay resources.schemas from outputs resources.json-style data.
    Returns a dict suitable for overlay["resources"]["schemas"] (each with catalog_ref, create: true).
    """
    catalogs = resources_data.get("catalogs") or {}
    if not isinstance(catalogs, dict):
        return {}
    out = {}
    for catalog_key, catalog_spec in catalogs.items():
        if not isinstance(catalog_spec, dict):
            continue
        for schema_key, schema_spec in (catalog_spec.get("schemas") or {}).items():
            if isinstance(schema_spec, dict):
                out[schema_key] = {
                    "name": schema_spec.get("name") or schema_key,
                    "catalog_ref": schema_spec.get("catalog_ref") or catalog_key,
                    "create": True,
                }
    return out
