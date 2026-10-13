# Databricks notebook source
# ============================================================================
# DCP SYNTHETIC PLATFORM
# 03_GENERATE_DOMAIN_LANDING
# ============================================================================

from pyspark.sql import functions as F

CATALOG = "dcp_synth"

p = spark.table(f"{CATALOG}.`00_config`.synthetic_parameters").first()

ROOT = p.landing_root
RUN_ID = f"run_{p.fixed_generated_at:%Y%m%dT%H%M%S}"
GENERATED_AT = p.fixed_generated_at

print(f"Run ID: {RUN_ID}")
print(f"Root   : {ROOT}")

# COMMAND ----------
# LOAD PATIENT MASTER

patients = (
    spark.read
    .option("header", True)
    .csv(f"{ROOT}/SRC-11/patient_master/{RUN_ID}")
)

print("Patients:", patients.count())

# COMMAND ----------
# CONSENT SCOPES

scopes = spark.createDataFrame(
    [("CARE_TEAM",),("RESEARCH",),("EHR_SHARING",),("CAREGIVER",)],
    ["consent_scope"]
)

display(scopes)

# COMMAND ----------
# GENERATE CONSENT EVENTS

consent = (
    patients.select("patient_id")
    .crossJoin(scopes)
    .withColumn(
        "consent_event_id",
        F.sha2(F.concat_ws("|","patient_id","consent_scope",F.lit("GRANT")),256)
    )
    .withColumn("purpose",F.lit("CARE_OR_ANALYTICS"))
    .withColumn("recipient",F.lit("AUTHORIZED_RECIPIENT"))
    .withColumn("previous_state",F.lit("NONE"))
    .withColumn("new_state",F.lit("GRANTED"))
    .withColumn("event_time",F.lit(GENERATED_AT).cast("timestamp"))
    .withColumn("source_application",F.lit("myDiabete"))
    .withColumn("source_id",F.lit("SRC-14"))
    .withColumn("ingested_at",F.lit(GENERATED_AT).cast("timestamp"))
    .withColumn("_run_id",F.lit(RUN_ID))
)

(consent.write.mode("overwrite")
 .json(f"{ROOT}/SRC-14/consent_events/{RUN_ID}"))

print("Consent events:", consent.count())

# COMMAND ----------
# GENERATE CONSENT PROPAGATION

targets = spark.createDataFrame(
    [("RESEARCH_FEED",),("EHR_API",),("REPORT_CACHE",),("ML_TRAINING",)],
    ["target_system"]
)

propagation = (
    consent.select("consent_event_id","patient_id","event_time")
    .crossJoin(targets)
    .withColumn("target_status",F.lit("COMPLETED"))
    .withColumn("submitted_at",F.col("event_time"))
    .withColumn("acknowledged_at",F.col("event_time"))
    .withColumn("failure_reason",F.lit(None).cast("string"))
    .withColumn("correlation_id",F.sha2(F.concat_ws("|","consent_event_id","target_system"),256))
    .withColumn("source_id",F.lit("SRC-15"))
    .withColumn("ingested_at",F.lit(GENERATED_AT).cast("timestamp"))
    .withColumn("_run_id",F.lit(RUN_ID))
)

(propagation.write.mode("overwrite")
 .json(f"{ROOT}/SRC-15/consent_propagation/{RUN_ID}"))

# COMMAND ----------
# COMPLIANCE CONTROLS

controls = (
 spark.range(1,61)
 .select(
   F.format_string("CTL-%03d",F.col("id")).alias("control_id"),
   F.lit("Privacy").alias("domain"),
   F.lit("Synthetic control").alias("control_objective"),
   F.lit("compliance@example.test").alias("owner"),
   F.lit("ACTIVE").alias("lifecycle_status"),
   F.lit(RUN_ID).alias("_run_id")
 )
)

(controls.coalesce(1)
 .write.mode("overwrite")
 .option("header",True)
 .csv(f"{ROOT}/SRC-25/compliance_controls/{RUN_ID}"))

# COMMAND ----------
# CONTROL ASSESSMENTS

assessments = (
 controls.select("control_id")
 .withColumn("assessment_id",F.concat(F.lit("ASM-"),F.substring("control_id",-3,3)))
 .withColumn("assessed_at",F.current_date())
 .withColumn("result",F.lit("EFFECTIVE"))
 .withColumn("approval_status",F.lit("APPROVED"))
 .withColumn("_run_id",F.lit(RUN_ID))
)

(assessments.write.mode("overwrite")
 .json(f"{ROOT}/SRC-25/control_assessments/{RUN_ID}"))

# COMMAND ----------
# PRODUCT MASTER

products = (
 spark.range(1,21)
 .select(
  F.format_string("REG-PROD-%03d",F.col("id")).alias("product_id"),
  F.concat(F.lit("Synthetic regulated product "),F.col("id")).alias("product_name"),
  F.lit("DEVICE").alias("product_class"),
  F.lit("CH").alias("lead_market"),
  F.lit("ACTIVE").alias("lifecycle_status"),
  F.lit(RUN_ID).alias("_run_id")
 )
)

(products.write.mode("overwrite")
 .json(f"{ROOT}/SRC-23/product_master/{RUN_ID}"))

# COMMAND ----------
# SUBMISSION MASTER

submissions = (
 spark.range(1,101)
 .select(
  F.format_string("SUB-%04d",F.col("id")).alias("submission_id"),
  F.format_string("REG-PROD-%03d",((F.col("id")-1)%20)+1).alias("product_id"),
  F.lit("FDA").alias("authority"),
  F.lit("ON_TRACK").alias("risk_status"),
  F.lit(RUN_ID).alias("_run_id")
 )
)

(submissions.write.mode("overwrite")
 .json(f"{ROOT}/SRC-21/submission_master/{RUN_ID}"))

# COMMAND ----------
# AUTHORITY INTERACTIONS

interactions = (
 spark.range(1,151)
 .select(
  F.format_string("AI-%04d",F.col("id")).alias("interaction_id"),
  F.format_string("SUB-%04d",((F.col("id")-1)%100)+1).alias("submission_id"),
  F.lit("QUESTION").alias("interaction_type"),
  F.current_date().alias("received_date"),
  F.current_date().alias("response_due_date"),
  F.lit("OPEN").alias("status"),
  F.lit(RUN_ID).alias("_run_id")
 )
)

(interactions.write.mode("overwrite")
 .json(f"{ROOT}/SRC-24/authority_interactions/{RUN_ID}"))

# COMMAND ----------
# MANIFEST

print('Domain landing generation completed.')
print('READY FOR 04_ingest_landing_to_delta')
