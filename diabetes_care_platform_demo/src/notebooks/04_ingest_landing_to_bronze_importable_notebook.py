# Databricks notebook source
# COMMAND ----------
from datetime import datetime
p=spark.table('dcp_synth.`00_config`.synthetic_parameters').first()
ROOT=p.landing_root; RUN_ID=f'run_{p.fixed_generated_at:%Y%m%dT%H%M%S}'
# COMMAND ----------
def save(df,target,source,path,fmt):
 started=datetime.utcnow()
 try:
  spark.sql(f'DROP TABLE IF EXISTS {target}')
  df.write.format('delta').mode('overwrite').saveAsTable(target)
  n=spark.table(target).count(); status='SUCCEEDED'; err=None
  print(f'SUCCEEDED: {target}, rows={n}')
 except Exception as e:
  n=None; status='FAILED'; err=str(e)[:4000]
  raise
 finally:
  row=[(RUN_ID,source,target,path,fmt,status,n,started,datetime.utcnow(),err)]
  spark.createDataFrame(row,'run_id string,source_id string,target_table string,landing_path string,file_format string,status string,row_count long,started_at timestamp,completed_at timestamp,error_message string').write.mode('append').saveAsTable('dcp_synth.00_config.ingestion_audit')
# COMMAND ----------
path=f'{ROOT}/SRC-11/patient_master/*'; save(spark.read.option('header',True).csv(path),'dcp_synth.01_bronze.patient_master','SRC-11',path,'CSV')
# COMMAND ----------
path=f'{ROOT}/SRC-01/cgm_readings'; save(spark.read.parquet(path),'dcp_synth.01_bronze.cgm_readings','SRC-01',path,'PARQUET')
# COMMAND ----------
path=f'{ROOT}/SRC-06/mysugr_logbook/*'; save(spark.read.json(path),'dcp_synth.01_bronze.mysugr_logbook','SRC-06',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-16/device_events/*'; save(spark.read.json(path),'dcp_synth.01_bronze.device_events','SRC-16',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-14/consent_events/*'; save(spark.read.json(path),'dcp_synth.01_bronze.consent_events','SRC-14',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-15/consent_propagation/*'; save(spark.read.json(path),'dcp_synth.01_bronze.consent_propagation','SRC-15',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-25/compliance_controls/*'; save(spark.read.option('header',True).csv(path),'dcp_synth.05_compliance.controls','SRC-25',path,'CSV')
# COMMAND ----------
path=f'{ROOT}/SRC-25/control_assessments/*'; save(spark.read.json(path),'dcp_synth.05_compliance.control_assessments','SRC-25',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-23/product_master/*'; save(spark.read.json(path),'dcp_synth.06_regulatory.product_master','SRC-23',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-21/submission_master/*'; save(spark.read.json(path),'dcp_synth.06_regulatory.submission_master','SRC-21',path,'JSON')
# COMMAND ----------
path=f'{ROOT}/SRC-24/authority_interactions/*'; save(spark.read.json(path),'dcp_synth.06_regulatory.authority_interactions','SRC-24',path,'JSON')
