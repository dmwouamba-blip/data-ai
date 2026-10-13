# Databricks notebook source
# MAGIC %md
# MAGIC # 05a Silver and Gold Predeployment Gate
# MAGIC Validates inventory, schemas, Delta format, counts, and referential integrity.

# COMMAND ----------
required = {
    "dcp_synth.01_bronze.patient_master": ["patient_id", "diabetes_type", "therapy_profile"],
    "dcp_synth.01_bronze.cgm_readings": ["reading_id", "patient_id", "event_time", "glucose_mmol_l", "trend", "device_id", "ingested_at"],
    "dcp_synth.01_bronze.mysugr_logbook": ["entry_id", "patient_id", "event_time"],
    "dcp_synth.01_bronze.device_events": ["event_id", "patient_id", "device_id", "event_time"],
    "dcp_synth.01_bronze.consent_events": ["consent_event_id", "patient_id", "consent_scope", "purpose", "recipient", "event_time", "ingested_at"],
    "dcp_synth.01_bronze.consent_propagation": ["consent_event_id", "target_status"],
    "dcp_synth.05_compliance.controls": ["control_id", "domain", "owner"],
    "dcp_synth.05_compliance.control_assessments": ["control_id", "assessment_id", "result"],
    "dcp_synth.06_regulatory.product_master": ["product_id"],
    "dcp_synth.06_regulatory.submission_master": ["submission_id", "product_id"],
    "dcp_synth.06_regulatory.authority_interactions": ["interaction_id", "submission_id"],
}
errors = []

# COMMAND ----------
# Inventory
for table in required:
    if not spark.catalog.tableExists(table):
        errors.append(f"Missing table: {table}")
print("Inventory checked")

# COMMAND ----------
# Required columns
for table, columns in required.items():
    if spark.catalog.tableExists(table):
        missing = set(columns) - set(spark.table(table).columns)
        if missing:
            errors.append(f"{table} missing columns {sorted(missing)}")
print("Schemas checked")

# COMMAND ----------
# Delta format
for table in required:
    if spark.catalog.tableExists(table):
        fmt = spark.sql(f"DESCRIBE DETAIL {table}").select("format").first()[0]
        if fmt.lower() != "delta":
            errors.append(f"{table} format={fmt}")
print("Delta formats checked")

# COMMAND ----------
# Deterministic counts
expected = {
    "dcp_synth.01_bronze.patient_master": 100,
    "dcp_synth.05_compliance.controls": 60,
    "dcp_synth.05_compliance.control_assessments": 60,
    "dcp_synth.06_regulatory.product_master": 20,
    "dcp_synth.06_regulatory.submission_master": 100,
    "dcp_synth.06_regulatory.authority_interactions": 150,
}
for table, expected_count in expected.items():
    actual = spark.table(table).count()
    if actual != expected_count:
        errors.append(f"{table}: expected {expected_count}, got {actual}")
print("Counts checked")

# COMMAND ----------
# Patient relationships
queries = {
    "CGM patient orphan": "SELECT * FROM dcp_synth.01_bronze.cgm_readings g LEFT ANTI JOIN dcp_synth.01_bronze.patient_master p ON g.patient_id=p.patient_id LIMIT 1",
    "mySugr patient orphan": "SELECT * FROM dcp_synth.01_bronze.mysugr_logbook m LEFT ANTI JOIN dcp_synth.01_bronze.patient_master p ON m.patient_id=p.patient_id LIMIT 1",
    "Consent patient orphan": "SELECT * FROM dcp_synth.01_bronze.consent_events c LEFT ANTI JOIN dcp_synth.01_bronze.patient_master p ON c.patient_id=p.patient_id LIMIT 1",
}
for label, query in queries.items():
    if spark.sql(query).count():
        errors.append(label)
print("Patient references checked")

# COMMAND ----------
# Compliance and regulatory relationships
queries = {
    "Assessment control orphan": "SELECT * FROM dcp_synth.05_compliance.control_assessments a LEFT ANTI JOIN dcp_synth.05_compliance.controls c ON a.control_id=c.control_id LIMIT 1",
    "Submission product orphan": "SELECT * FROM dcp_synth.06_regulatory.submission_master s LEFT ANTI JOIN dcp_synth.06_regulatory.product_master p ON s.product_id=p.product_id LIMIT 1",
    "Interaction submission orphan": "SELECT * FROM dcp_synth.06_regulatory.authority_interactions i LEFT ANTI JOIN dcp_synth.06_regulatory.submission_master s ON i.submission_id=s.submission_id LIMIT 1",
}
for label, query in queries.items():
    if spark.sql(query).count():
        errors.append(label)
print("Domain references checked")

# COMMAND ----------
# Stop/go gate
if errors:
    raise Exception("PRECHECK FAILED\n" + "\n".join(errors))
print("PRECHECK PASSED: READY FOR SILVER AND GOLD")
