# Databricks notebook source
# COMMAND ----------
from pyspark.sql import functions as F
p=spark.table('dcp_synth.`00_config`.synthetic_parameters').first()
ROOT=p.landing_root; RUN_ID=f'run_{p.fixed_generated_at:%Y%m%dT%H%M%S}'; NOW=p.fixed_generated_at
patients=spark.read.option('header',True).csv(f'{ROOT}/SRC-11/patient_master/{RUN_ID}')
# COMMAND ----------
scopes=spark.createDataFrame([('CARE_TEAM',),('RESEARCH',),('EHR_SHARING',),('CAREGIVER',)],['consent_scope'])
base=(patients.select('patient_id').crossJoin(scopes).withColumn('grant_date',F.date_add(F.lit(str(p.history_start_date)).cast('date'),F.pmod(F.xxhash64('patient_id','consent_scope'),F.lit(30)).cast('int'))))
def consent(state):
 action='GRANT' if state=='GRANTED' else 'REVOKE'
 return (base.withColumn('consent_event_id',F.sha2(F.concat_ws('|','patient_id','consent_scope',F.lit(action)),256))
  .withColumn('purpose',F.lit('CARE_OR_ANALYTICS')).withColumn('recipient',F.lit('AUTHORIZED_RECIPIENT'))
  .withColumn('previous_state',F.lit('NONE' if state=='GRANTED' else 'GRANTED')).withColumn('new_state',F.lit(state))
  .withColumn('event_time',(F.col('grant_date') if state=='GRANTED' else F.date_add('grant_date',180)).cast('timestamp'))
  .withColumn('source_application',F.lit('myDiabete')).withColumn('source_id',F.lit('SRC-14'))
  .withColumn('ingested_at',F.lit(NOW).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)))
cols=['consent_event_id','patient_id','consent_scope','purpose','recipient','previous_state','new_state','event_time','source_application','source_id','ingested_at','_run_id']
grants=consent('GRANTED').select(*cols)
revokes=consent('REVOKED').where(F.pmod(F.xxhash64('patient_id','consent_scope',F.lit(77)),F.lit(10))==0).select(*cols)
consents=grants.unionByName(revokes)
consents.write.mode('overwrite').json(f'{ROOT}/SRC-14/consent_events/{RUN_ID}')
print('consent_events',consents.count())
# COMMAND ----------
targets=spark.createDataFrame([(x,) for x in ['RESEARCH_FEED','EHR_API','REPORT_CACHE','ML_TRAINING']],['target_system'])
prop=(consents.select('consent_event_id','patient_id','event_time').crossJoin(targets)
 .withColumn('h',F.pmod(F.xxhash64('consent_event_id','target_system'),F.lit(20)))
 .withColumn('target_status',F.when(F.col('h')==0,'FAILED').when(F.col('h')==1,'PROCESSING').otherwise('COMPLETED'))
 .withColumn('submitted_at',F.col('event_time')).withColumn('acknowledged_at',F.when(F.col('target_status')=='FAILED',F.lit(None).cast('timestamp')).otherwise(F.col('event_time')+F.expr('INTERVAL 2 MINUTES')))
 .withColumn('failure_reason',F.when(F.col('target_status')=='FAILED','SYNTHETIC_TIMEOUT'))
 .withColumn('correlation_id',F.sha2(F.concat_ws('|','consent_event_id','target_system'),256))
 .withColumn('source_id',F.lit('SRC-15')).withColumn('ingested_at',F.lit(NOW).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)).drop('h'))
prop.write.mode('overwrite').json(f'{ROOT}/SRC-15/consent_propagation/{RUN_ID}')
print('propagation',prop.count())
# COMMAND ----------
controls=(spark.range(1,61).select(F.format_string('CTL-%03d','id').alias('control_id'),F.element_at(F.array(*[F.lit(x) for x in ['Privacy','Security','Quality','Clinical','Post-market','Data/AI Governance']]),F.expr('CAST(1+pmod(id,6) AS INT)')).alias('domain'),F.concat(F.lit('Synthetic control objective '),'id').alias('control_objective'),F.concat(F.lit('owner-'),F.pmod('id',F.lit(8)),F.lit('@example.test')).alias('owner'),F.lit('ACTIVE').alias('lifecycle_status'),F.lit('SRC-25').alias('source_id'),F.lit(NOW).cast('timestamp').alias('ingested_at'),F.lit(RUN_ID).alias('_run_id')))
controls.coalesce(1).write.mode('overwrite').option('header',True).csv(f'{ROOT}/SRC-25/compliance_controls/{RUN_ID}')
assess=(controls.select('control_id').withColumn('assessment_id',F.concat(F.lit('ASM-'),F.substring('control_id',-3,3))).withColumn('assessed_at',F.date_sub(F.lit(str(p.history_end_date)).cast('date'),F.pmod(F.xxhash64('control_id'),F.lit(60)).cast('int'))).withColumn('result',F.when(F.pmod(F.xxhash64('control_id',F.lit(2)),F.lit(10))<8,'EFFECTIVE').otherwise('INEFFECTIVE')).withColumn('approval_status',F.lit('APPROVED')).withColumn('source_id',F.lit('SRC-25')).withColumn('ingested_at',F.lit(NOW).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)))
assess.write.mode('overwrite').json(f'{ROOT}/SRC-25/control_assessments/{RUN_ID}')
# COMMAND ----------
products=(spark.range(1,21).select(F.format_string('REG-PROD-%03d','id').alias('product_id'),F.concat(F.lit('Synthetic regulated product '),'id').alias('product_name'),F.element_at(F.array(F.lit('DEVICE'),F.lit('SOFTWARE'),F.lit('IVD')),F.expr('CAST(1+pmod(id,3) AS INT)')).alias('product_class'),F.element_at(F.array(F.lit('DE'),F.lit('CH'),F.lit('US'),F.lit('FR')),F.expr('CAST(1+pmod(id,4) AS INT)')).alias('lead_market'),F.lit('ACTIVE').alias('lifecycle_status'),F.lit('SRC-23').alias('source_id'),F.lit(NOW).cast('timestamp').alias('updated_at'),F.lit(RUN_ID).alias('_run_id')))
products.write.mode('overwrite').json(f'{ROOT}/SRC-23/product_master/{RUN_ID}')
# COMMAND ----------
subs=(spark.range(1,101).select('id',F.format_string('SUB-%04d','id').alias('submission_id'),F.element_at(F.array(F.lit('INITIAL'),F.lit('VARIATION'),F.lit('RENEWAL')),F.expr('CAST(1+pmod(id,3) AS INT)')).alias('submission_type'),F.format_string('REG-PROD-%03d',F.lit(1)+F.pmod('id',F.lit(20))).alias('product_id'),F.element_at(F.array(F.lit('DE'),F.lit('CH'),F.lit('US'),F.lit('FR')),F.expr('CAST(1+pmod(id,4) AS INT)')).alias('market'),F.element_at(F.array(F.lit('BfArM'),F.lit('Swissmedic'),F.lit('FDA'),F.lit('ANSM')),F.expr('CAST(1+pmod(id,4) AS INT)')).alias('authority'),F.element_at(F.array(*[F.lit(x) for x in ['PREPARATION','READINESS_REVIEW','SUBMITTED','AUTHORITY_REVIEW','APPROVED']]),F.expr('CAST(1+pmod(id,5) AS INT)')).alias('workflow_stage'),F.date_add(F.lit('2026-01-01').cast('date'),F.pmod(F.col('id')*13,F.lit(300)).cast('int')).alias('planned_submission_date')).withColumn('actual_submission_date',F.when(F.pmod('id',F.lit(5))>1,F.date_add('planned_submission_date',F.pmod('id',F.lit(15)).cast('int')))).withColumn('authority_due_date',F.date_add('planned_submission_date',90)).withColumn('owner',F.concat(F.lit('reg-owner-'),F.pmod('id',F.lit(10)),F.lit('@example.test'))).withColumn('risk_status',F.when(F.pmod('id',F.lit(7))==0,'AT_RISK').otherwise('ON_TRACK')).withColumn('source_id',F.lit('SRC-21')).withColumn('updated_at',F.lit(NOW).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)).drop('id'))
subs.write.mode('overwrite').json(f'{ROOT}/SRC-21/submission_master/{RUN_ID}')
# COMMAND ----------
inter=(spark.range(1,151).select(F.format_string('AI-%04d','id').alias('interaction_id'),F.format_string('SUB-%04d',F.lit(1)+F.pmod('id',F.lit(100))).alias('submission_id'),F.element_at(F.array(F.lit('QUESTION'),F.lit('REQUEST_FOR_INFORMATION'),F.lit('DECISION')),F.expr('CAST(1+pmod(id,3) AS INT)')).alias('interaction_type'),F.date_add(F.lit('2026-03-01').cast('date'),F.pmod(F.col('id')*7,F.lit(180)).cast('int')).alias('received_date')).withColumn('response_due_date',F.date_add('received_date',30)).withColumn('status',F.when(F.pmod(F.xxhash64('interaction_id'),F.lit(6))==0,'OVERDUE').otherwise('OPEN')).withColumn('source_id',F.lit('SRC-24')).withColumn('ingested_at',F.lit(NOW).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)))
inter.write.mode('overwrite').json(f'{ROOT}/SRC-24/authority_interactions/{RUN_ID}')
print('domain generation complete')
