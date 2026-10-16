# Databricks notebook source
"""Static source checks for the three backup notebooks in the deployed bundle."""

from pathlib import Path

# File paths are relative to this notebook's source location after bundle deploy.
expected = {
    "create_validate_backup.py": [
        "DEEP CLONE",
        "CTAS_SNAPSHOT",
        "taskValues.set",
        "READY_FOR_REFRESH",
        "backup_execution_log",
    ],
    "apply_retention.py": [
        "v_retention_candidates",
        "DROP TABLE IF EXISTS",
        "retention_status",
        "DELETED",
    ],
    "validate_full_refresh.py": [
        "01_bronze.patient_master",
        "02_silver.glucose_readings",
        "03_gold.dp02_patient_glucose_summary",
        "raise RuntimeError",
    ],
}

backup_dir = Path(__file__).resolve().parents[2] / "src" / "notebooks" / "backup"
failures = []
for file_name, tokens in expected.items():
    path = backup_dir / file_name
    if not path.exists():
        failures.append(f"Missing notebook source: {path}")
        continue
    text = path.read_text(encoding="utf-8")
    for token in tokens:
        if token not in text:
            failures.append(f"{file_name}: missing token {token!r}")

if failures:
    raise AssertionError("Static notebook contract failed:\n- " + "\n- ".join(failures))

print("PASS: static contracts for backup notebooks")
