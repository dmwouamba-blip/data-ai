# Databricks notebook source
# ==========================================================================
# 04_ingest_landing_to_bronze.py
# DCP Synthetic Platform
# Importable Databricks notebook (uses # COMMAND ---------- separators)
# ==========================================================================

# COMMAND ----------
from pyspark.sql import functions as F

CATALOG = "dcp_synth"
spark.sql(f"USE CATALOG {CATALOG}")

p = spark.table(f"{CATALOG}.`00_config`.synthetic_parameters").first()
ROOT = p.landing_root
RUN_ID = f"run_{p.fixed_generated_at:%Y%m%dT%H%M%S}"

print(f"Catalog={CATALOG}")
print(f"RunID={RUN_ID}")
print(f"Landing={ROOT}")

# COMMAND ----------
# Helper functions

def save_delta(df, target_table):
    spark.sql(f"DROP TABLE IF EXISTS {target_table}")
    df.write.format("delta").mode("overwrite").saveAsTable(target_table)
    cnt = spark.table(target_table).count()
    print(f"SUCCESS: {target_table} rows={cnt:,}")

# COMMAND ----------
# SRC-11 Patient Master
save_delta(
    spark.read.option("header",True).csv(f"{ROOT}/SRC-11/patient_master/*"),
    "dcp_synth.01_bronze.patient_master"
)

# COMMAND ----------
# SRC-01 CGM Readings
save_delta(
    spark.read.parquet(f"{ROOT}/SRC-01/cgm_readings"),
    "dcp_synth.01_bronze.cgm_readings"
)

# COMMAND ----------
# SRC-06 mySugr Logbook
save_delta(
    spark.read.json(f"{ROOT}/SRC-06/mysugr_logbook/*"),
    "dcp_synth.01_bronze.mysugr_logbook"
)

# COMMAND ----------
# SRC-16 Device Events
save_delta(
    spark.read.json(f"{ROOT}/SRC-16/device_events/*"),
    "dcp_synth.01_bronze.device_events"
)

# COMMAND ----------
# SRC-14 Consent Events
save_delta(
    spark.read.json(f"{ROOT}/SRC-14/consent_events/*"),
    "dcp_synth.01_bronze.consent_events"
)

# COMMAND ----------
# SRC-15 Consent Propagation
save_delta(
    spark.read.json(f"{ROOT}/SRC-15/consent_propagation/*"),
    "dcp_synth.01_bronze.consent_propagation"
)

# COMMAND ----------
# SRC-25 Controls
save_delta(
    spark.read.option("header",True).csv(f"{ROOT}/SRC-25/compliance_controls/*"),
    "dcp_synth.05_compliance.controls"
)

# COMMAND ----------
# SRC-25 Control Assessments
save_delta(
    spark.read.json(f"{ROOT}/SRC-25/control_assessments/*"),
    "dcp_synth.05_compliance.control_assessments"
)

# COMMAND ----------
# SRC-23 Product Master
save_delta(
    spark.read.json(f"{ROOT}/SRC-23/product_master/*"),
    "dcp_synth.06_regulatory.product_master"
)

# COMMAND ----------
# SRC-21 Submission Master
save_delta(
    spark.read.json(f"{ROOT}/SRC-21/submission_master/*"),
    "dcp_synth.06_regulatory.submission_master"
)

# COMMAND ----------
# SRC-24 Authority Interactions
save_delta(
    spark.read.json(f"{ROOT}/SRC-24/authority_interactions/*"),
    "dcp_synth.06_regulatory.authority_interactions"
)

# COMMAND ----------
print("READY FOR 05a_precheck_silver_gold")
