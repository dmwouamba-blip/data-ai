# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# MAGIC %md
# MAGIC # 08 Generate Complete Dashboard Data
# MAGIC Deterministic synthetic non-production dashboard-support data.
# MAGIC This notebook uses dedicated dashboard-support paths so it does not overwrite canonical SRC-14, SRC-15, SRC-21, or SRC-24 landing contracts.

# COMMAND ----------

from pyspark.sql import functions as F

p = spark.table("dcp_synth.`00_config`.synthetic_parameters").first()
root = p.landing_root
run_id = f"run_{p.fixed_generated_at:%Y%m%dT%H%M%S}"
ts = p.fixed_generated_at
print({"root": root, "run_id": run_id})

# COMMAND ----------

# CIO: daily SLA metrics, controls, resources, adoption, release readiness and incidents.
days = spark.range(0, 90).select(
    F.date_sub(F.to_date(F.lit(ts)), F.col("id").cast("int")).alias("metric_date")
)
service = (
    days.crossJoin(spark.createDataFrame(
        [("AVAILABILITY_PCT",), ("PIPELINE_SUCCESS_PCT",), ("FRESHNESS_SLA_PCT",)],
        ["metric_name"],
    ))
    .withColumn("metric_value", F.round(F.lit(95.0) + F.pmod(F.xxhash64("metric_date", "metric_name"), F.lit(500)) / 100, 2))
    .withColumn("target_value", F.lit(99.0))
    .withColumn("status", F.when(F.col("metric_value") >= 99, "GREEN").otherwise("AMBER"))
    .withColumn("_run_id", F.lit(run_id))
)
service.write.mode("overwrite").parquet(f"{root}/SRC-20/platform_sla_metrics")

controls = spark.createDataFrame(
    [("QUALITY", 96.0), ("CONSENT", 92.0), ("SECURITY", 98.0), ("RECOVERY", 88.0)],
    ["control_domain", "score_pct"],
).withColumn("assessed_at", F.lit(ts)).withColumn("_run_id", F.lit(run_id))
controls.write.mode("overwrite").json(f"{root}/SRC-20/control_posture/{run_id}")

resources = spark.createDataFrame(
    [("COMPUTE",72.0,44.0),("STORAGE",58.0,23.0),("STREAMING",64.0,18.0),("SERVING",61.0,15.0)],
    ["resource_type","utilization_pct","cost_share_pct"],
).withColumn("metric_time",F.lit(ts)).withColumn("_run_id",F.lit(run_id))
resources.write.mode("overwrite").json(f"{root}/SRC-20/platform_resources/{run_id}")

adoption = spark.createDataFrame(
    [("CIO",14,11),("REGULATORY",25,19),("PLATFORM_ADMIN",18,16),("PATIENT",100,82)],
    ["experience","eligible_users","active_users"],
).withColumn("metric_date",F.to_date(F.lit(ts))).withColumn("_run_id",F.lit(run_id))
adoption.write.mode("overwrite").json(f"{root}/SRC-20/dashboard_adoption/{run_id}")

release = spark.createDataFrame(
    [("DP-01","TESTED","READY"),("DP-02","TESTED","READY"),("DP-03","IMPLEMENTED","ACTION"),("DP-09","TESTED","READY"),("DP-10","TESTED","READY"),("DP-11","IMPLEMENTED","ACTION"),("DP-15","IMPLEMENTED","ACTION"),("DP-19","TESTED","READY")],
    ["product_id","maturity","readiness_status"],
).withColumn("owner",F.lit("SYNTHETIC_OWNER")).withColumn("next_action",F.when(F.col("readiness_status")=="ACTION","Complete test evidence").otherwise("Review")).withColumn("_run_id",F.lit(run_id))
release.write.mode("overwrite").json(f"{root}/SRC-20/release_readiness/{run_id}")

incidents = spark.range(1,31).select(
    F.format_string("INC-%04d","id").alias("incident_id"),
    F.element_at(F.array(F.lit("LOW"),F.lit("MEDIUM"),F.lit("HIGH")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("severity"),
    F.element_at(F.array(F.lit("OPEN"),F.lit("RECOVERED"),F.lit("MONITORING")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("status"),
    F.date_sub(F.to_date(F.lit(ts)),F.pmod("id",F.lit(30)).cast("int")).alias("opened_date"),
    F.lit("SYNTHETIC_PLATFORM_OWNER").alias("owner"),F.lit(run_id).alias("_run_id"),
)
incidents.write.mode("overwrite").json(f"{root}/SRC-20/platform_incidents/{run_id}")

# COMMAND ----------

# Regulatory dashboard support. Dedicated paths avoid replacing canonical regulatory datasets.
submissions = spark.range(1,101).select(
    F.format_string("SUB-%04d","id").alias("submission_id"),
    F.format_string("REG-PROD-%03d",F.lit(1)+F.pmod("id",F.lit(20))).alias("product_id"),
    F.element_at(F.array(F.lit("EU"),F.lit("US"),F.lit("CH"),F.lit("UK")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("market"),
    F.element_at(F.array(F.lit("EMA"),F.lit("FDA"),F.lit("SWISSMEDIC"),F.lit("MHRA")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("authority"),
    F.element_at(F.array(F.lit("PLANNING"),F.lit("COMPILING"),F.lit("SUBMITTED"),F.lit("REVIEW")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("stage"),
    F.element_at(F.array(F.lit("ON_TRACK"),F.lit("AT_RISK"),F.lit("BLOCKED")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("risk_status"),
    F.date_add(F.to_date(F.lit(ts)),F.pmod("id",F.lit(120)).cast("int")).alias("target_date"),
    F.lit("SYNTHETIC_REG_OWNER").alias("owner"),F.lit(run_id).alias("_run_id"),
)
submissions.write.mode("overwrite").json(f"{root}/SRC-21/dashboard_regulatory_submissions/{run_id}")

readiness = submissions.select("submission_id").withColumn("required_items",F.lit(25)).withColumn("complete_items",F.lit(20)+F.pmod(F.xxhash64("submission_id"),F.lit(6))).withColumn("readiness_pct",F.round(F.col("complete_items")/F.col("required_items")*100,1)).withColumn("exception_count",F.col("required_items")-F.col("complete_items")).withColumn("_run_id",F.lit(run_id))
readiness.write.mode("overwrite").json(f"{root}/SRC-21/submission_readiness/{run_id}")

authority = spark.range(1,151).select(
    F.format_string("AUTH-%04d","id").alias("interaction_id"),F.format_string("SUB-%04d",F.lit(1)+F.pmod("id",F.lit(100))).alias("submission_id"),
    F.element_at(F.array(F.lit("QUESTION"),F.lit("COMMITMENT"),F.lit("MEETING")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("interaction_type"),
    F.element_at(F.array(F.lit("OPEN"),F.lit("RESPONDED"),F.lit("OVERDUE")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("status"),
    F.date_add(F.to_date(F.lit(ts)),(F.pmod("id",F.lit(30))-10).cast("int")).alias("due_date"),F.lit("SYNTHETIC_REG_OWNER").alias("owner"),F.lit(run_id).alias("_run_id"),
)
authority.write.mode("overwrite").json(f"{root}/SRC-24/dashboard_authority_interactions/{run_id}")

evidence = spark.range(1,61).select(
    F.format_string("CTL-%03d","id").alias("control_id"),
    F.element_at(F.array(F.lit("PRIVACY"),F.lit("QUALITY"),F.lit("CLINICAL"),F.lit("REGULATORY")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("domain"),
    F.element_at(F.array(F.lit("READY"),F.lit("GAP"),F.lit("EXPIRED")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("evidence_status"),
    F.to_date(F.lit(ts)).alias("assessed_date"),F.lit("SYNTHETIC_CONTROL_OWNER").alias("owner"),F.lit(run_id).alias("_run_id"),
)
evidence.write.mode("overwrite").json(f"{root}/SRC-25/compliance_evidence/{run_id}")

# COMMAND ----------

# Platform administration: source health, runs, exceptions, access and recovery.
sources = spark.table("dcp_synth.`00_config`.source_catalog").select("source_id","source_name","domain").withColumn("freshness_minutes",F.pmod(F.xxhash64("source_id"),F.lit(180))).withColumn("freshness_status",F.when(F.col("freshness_minutes")<60,"FRESH").when(F.col("freshness_minutes")<120,"WARNING").otherwise("STALE")).withColumn("lifecycle_status",F.element_at(F.array(F.lit("ACTIVE"),F.lit("DRAFT"),F.lit("DEPRECATED")),(F.lit(1)+F.pmod(F.xxhash64("source_id"),F.lit(3))).cast("int"))).withColumn("_run_id",F.lit(run_id))
sources.write.mode("overwrite").json(f"{root}/SRC-20/source_health/{run_id}")

runs = spark.range(1,181).select(F.format_string("RUN-%05d","id").alias("pipeline_run_id"),F.format_string("SRC-%02d",F.lit(1)+F.pmod("id",F.lit(28))).alias("source_id"),F.expr("timestamp'2026-10-07 08:00:00' - id * interval 1 hour").alias("started_at"),(F.lit(30)+F.pmod("id",F.lit(600))).alias("duration_seconds"),F.element_at(F.array(F.lit("SUCCESS"),F.lit("FAILED"),F.lit("RECOVERED")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("status"),F.lit(run_id).alias("_run_id"))
runs.write.mode("overwrite").parquet(f"{root}/SRC-20/pipeline_runs")

exceptions = spark.range(1,61).select(F.format_string("EX-%04d","id").alias("exception_id"),F.format_string("SRC-%02d",F.lit(1)+F.pmod("id",F.lit(28))).alias("source_id"),F.element_at(F.array(F.lit("QUARANTINE"),F.lit("SCHEMA_DRIFT"),F.lit("REPLAY"),F.lit("ACCESS")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("exception_type"),F.element_at(F.array(F.lit("LOW"),F.lit("MEDIUM"),F.lit("HIGH")),(F.lit(1)+F.pmod("id",F.lit(3))).cast("int")).alias("severity"),F.lit("OPEN").alias("status"),F.lit("SYNTHETIC_PLATFORM_OWNER").alias("owner"),F.lit("Investigate and close").alias("next_action"),F.expr("timestamp'2026-10-07 08:00:00' - id * interval 2 hour").alias("opened_at"),F.lit(run_id).alias("_run_id"))
exceptions.write.mode("overwrite").json(f"{root}/SRC-20/platform_exceptions/{run_id}")

access = spark.range(1,41).select(F.format_string("AUD-%04d","id").alias("audit_event_id"),F.element_at(F.array(F.lit("GRANT"),F.lit("REVOKE"),F.lit("DENY"),F.lit("POLICY_CHANGE")),(F.lit(1)+F.pmod("id",F.lit(4))).cast("int")).alias("event_type"),F.lit("SYNTHETIC_GROUP").alias("principal"),F.lit("dcp_synth").alias("object_name"),F.expr("timestamp'2026-10-07 08:00:00' - id * interval 3 hour").alias("event_time"),F.lit(run_id).alias("_run_id"))
access.write.mode("overwrite").json(f"{root}/SRC-20/access_audit/{run_id}")

recovery = spark.createDataFrame([("LANDING","READY",4,24),("BRONZE","READY",4,24),("SILVER","TESTED",8,24),("GOLD","TESTED",8,24)],["layer","recovery_state","rto_hours","rpo_hours"]).withColumn("tested_at",F.lit(ts)).withColumn("_run_id",F.lit(run_id))
recovery.write.mode("overwrite").json(f"{root}/SRC-20/recovery_state/{run_id}")

# COMMAND ----------

# Patient experience support. SRC-07 owns patient-generated events and sharing history.
patients = spark.read.option("header",True).csv(f"{root}/SRC-11/patient_master/{run_id}")
events = patients.select("patient_id").crossJoin(spark.range(1,6)).select(F.sha2(F.concat_ws("|","patient_id","id"),256).alias("event_id"),"patient_id",F.element_at(F.array(F.lit("MEAL"),F.lit("INSULIN"),F.lit("ACTIVITY"),F.lit("MEDICATION"),F.lit("NOTE")),F.col("id").cast("int")).alias("event_type"),F.expr("timestamp'2026-09-30 08:00:00' + id * interval 30 minute").alias("event_time"),F.round(F.lit(1)+F.pmod("id",F.lit(100))/10,1).alias("quantity"),F.lit("ACCEPTED").alias("sync_status"),F.lit(run_id).alias("_run_id"))
events.write.mode("overwrite").json(f"{root}/SRC-07/mydiabete_events/{run_id}")

alerts = patients.select("patient_id").withColumn("alert_id",F.sha2(F.concat_ws("|","patient_id",F.lit("ALERT")),256)).withColumn("alert_type",F.element_at(F.array(F.lit("LOW_GLUCOSE"),F.lit("HIGH_GLUCOSE"),F.lit("NO_SYNC")),(F.lit(1)+F.pmod(F.xxhash64("patient_id"),F.lit(3))).cast("int"))).withColumn("status",F.lit("OPEN")).withColumn("created_at",F.lit(ts)).withColumn("_run_id",F.lit(run_id))
alerts.write.mode("overwrite").json(f"{root}/SRC-17/patient_alerts/{run_id}")

sharing = patients.select("patient_id").crossJoin(spark.range(1,4)).withColumn("sharing_id",F.sha2(F.concat_ws("|","patient_id","id"),256)).withColumn("report_id",F.concat(F.lit("RPT-"),F.substring(F.sha2(F.concat_ws("|","patient_id","id"),256),1,12))).withColumn("recipient_type",F.element_at(F.array(F.lit("CARE_TEAM"),F.lit("CAREGIVER"),F.lit("PATIENT")),F.col("id").cast("int"))).withColumn("sharing_status",F.element_at(F.array(F.lit("SHARED"),F.lit("REVOKED"),F.lit("EXPIRED")),F.col("id").cast("int"))).withColumn("shared_at",F.lit(ts)).withColumn("_run_id",F.lit(run_id)).drop("id")
sharing.write.mode("overwrite").json(f"{root}/SRC-07/report_sharing/{run_id}")

# COMMAND ----------

# Deterministic validation and manifest.
expected = {
    "platform_sla_metrics": 270,
    "platform_incidents": 30,
    "dashboard_regulatory_submissions": 100,
    "submission_readiness": 100,
    "dashboard_authority_interactions": 150,
    "compliance_evidence": 60,
    "pipeline_runs": 180,
    "platform_exceptions": 60,
    "access_audit": 40,
    "mydiabete_events": patients.count() * 5,
    "patient_alerts": patients.count(),
    "report_sharing": patients.count() * 3,
}
actual = {"platform_sla_metrics":service.count(),"platform_incidents":incidents.count(),"dashboard_regulatory_submissions":submissions.count(),"submission_readiness":readiness.count(),"dashboard_authority_interactions":authority.count(),"compliance_evidence":evidence.count(),"pipeline_runs":runs.count(),"platform_exceptions":exceptions.count(),"access_audit":access.count(),"mydiabete_events":events.count(),"patient_alerts":alerts.count(),"report_sharing":sharing.count()}
failures=[f"{k}: expected={v}, actual={actual[k]}" for k,v in expected.items() if actual[k]!=v]
if failures: raise Exception("DASHBOARD DATA GENERATION FAILED\n"+"\n".join(failures))
print(actual)
print("DASHBOARD DATA GENERATION PASSED")