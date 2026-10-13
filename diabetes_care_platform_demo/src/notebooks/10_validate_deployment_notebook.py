# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# MAGIC %md
# MAGIC # 10 Postdeployment Validation
# MAGIC Persists test evidence and fails the workflow if any validation gate fails.

# COMMAND ----------

checks = []
def add(test_id, description, passed, actual):
    checks.append((test_id, description, "PASS" if passed else "FAIL", str(actual)))

# COMMAND ----------

patient_count = spark.table("dcp_synth.01_bronze.patient_master").count()
add("T-001", "Patient count equals configured count", patient_count == 100, patient_count)

# COMMAND ----------

current_consent = spark.table("dcp_synth.03_gold.dp10_patient_consent_current").count()
add("T-002", "One current consent row per patient and scope", current_consent == 400, current_consent)

# COMMAND ----------

glucose_failures = spark.sql("SELECT COUNT(*) c FROM dcp_synth.02_silver.glucose_readings WHERE quality_status='FAIL'").first()["c"]
add("T-003", "Generated CGM passes range rule", glucose_failures == 0, glucose_failures)

# COMMAND ----------

balance_failures = spark.sql("SELECT COUNT(*) c FROM dcp_synth.03_gold.dp02_patient_glucose_summary WHERE abs(tir_pct+tbr_pct+tar_pct-100)>0.1").first()["c"]
add("T-004", "TIR plus TBR plus TAR is approximately 100", balance_failures == 0, balance_failures)

# COMMAND ----------

propagation_failures = spark.sql("SELECT COUNT(*) c FROM dcp_synth.03_gold.dp11_consent_propagation_status WHERE target_status='FAILED'").first()["c"]
add("T-005", "Synthetic propagation failures exist", propagation_failures > 0, propagation_failures)

# COMMAND ----------

#compliance_rows = spark.table("dcp_synth.03_gold.dp15_healthcare_compliance_monitoring").count()
#add("T-006", "Compliance controls join to assessments", compliance_rows == 60, compliance_rows)

# COMMAND ----------

#product_count = spark.table("dcp_synth.03_gold.dp16_regulatory_product_master").count()
#submission_count = spark.table("dcp_synth.03_gold.dp19_regulatory_submission_master").count()
#interaction_count = spark.table("dcp_synth.03_gold.dp21_regulatory_authority_interactions").count()
#add("T-007", "Regulatory product count", product_count == 20, product_count)
#add("T-008", "Regulatory submission count", submission_count == 100, submission_count)
#add("T-009", "Authority interaction count", interaction_count == 150, interaction_count)

# COMMAND ----------

results = spark.createDataFrame(checks, "test_id string,test_description string,result string,actual_value string")
results.write.format("delta").mode("overwrite").saveAsTable("dcp_synth.09_test.deployment_results")
display(results.orderBy("test_id"))

# COMMAND ----------

failed = results.where("result='FAIL'").count()
if failed:
    raise Exception(f"DEPLOYMENT VALIDATION FAILED: {failed} test(s)")
print("DEPLOYMENT VALID: ALL TESTS PASSED")