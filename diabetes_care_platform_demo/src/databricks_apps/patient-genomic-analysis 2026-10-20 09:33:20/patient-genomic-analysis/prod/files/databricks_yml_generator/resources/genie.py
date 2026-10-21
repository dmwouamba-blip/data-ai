"""
Convert overlay resources.genie_rooms into bundle variables.
Genie rooms always pre-exist (create: false), so they become bundle variables
via the _variables_from_create_false_resources mechanism in the generated main.py.
"""


def build(overlay: dict) -> dict:
    """
    Build resources.genie_rooms for databricks.yml from overlay.
    Genie rooms are always create: false (they pre-exist), so no bundle
    resources are emitted. The generated main.py turns them into variables.
    """
    return {}


def json_to_overlay(resources_data: dict) -> dict:
    """
    Build overlay resources.genie_rooms from outputs resources.json-style data.
    Returns a dict suitable for overlay["resources"]["genie_rooms"].
    Each entry has id and create: false.
    """
    genie_rooms = resources_data.get("genie_rooms") or {}
    if not isinstance(genie_rooms, dict):
        return {}
    out = {}
    for key, spec in genie_rooms.items():
        if not isinstance(spec, dict):
            continue
        genie_id = spec.get("id")
        if not genie_id:
            continue
        out[key] = {"id": genie_id, "create": False}
    return out
