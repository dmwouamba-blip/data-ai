# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
from pyspark.sql import functions as F
p=spark.table('dcp_synth.`00_config`.synthetic_parameters').first()
ROOT=p.landing_root; SEED=int(p.deterministic_seed)
RUN_ID=f'run_{p.fixed_generated_at:%Y%m%dT%H%M%S}'
GENERATED_AT=p.fixed_generated_at
print(ROOT, RUN_ID)

# COMMAND ----------

patients=(spark.range(1,int(p.patient_count)+1).select(
 F.format_string('SYN-P-%04d','id').alias('patient_id'),
 F.format_string('Synthetic-%04d','id').alias('display_name'),
 F.expr("date_add(date'1955-01-01', CAST(pmod(xxhash64(id,42),18000) AS INT))").alias('birth_date'),
 F.element_at(F.array(*[F.lit(x) for x in ['DE','CH','FR','IT']]),F.expr('CAST(1+pmod(id,4) AS INT)')).alias('country'),
 F.element_at(F.array(F.lit('T1D'),F.lit('T2D')),F.expr('CAST(1+pmod(id,2) AS INT)')).alias('diabetes_type'),
 F.element_at(F.array(F.lit('CGM'),F.lit('SMBG'),F.lit('CGM+PUMP')),F.expr('CAST(1+pmod(id,3) AS INT)')).alias('therapy_profile'),
 F.lit('SYNTHETIC').alias('data_class'),F.lit('SRC-11').alias('source_id'),
 F.lit(GENERATED_AT).cast('timestamp').alias('ingested_at'),F.lit(RUN_ID).alias('_run_id')))
(patients.coalesce(1).write.mode('overwrite').option('header',True).csv(f'{ROOT}/SRC-11/patient_master/{RUN_ID}'))
print('patient_master',patients.count())

# COMMAND ----------

times=spark.sql(f"SELECT explode(sequence(timestamp'{p.history_start_date} 00:00:00',timestamp'{p.history_end_date} 23:55:00',interval 5 minutes)) event_time")
cgm=(patients.select('patient_id').crossJoin(times)
 .withColumn('reading_id',F.sha2(F.concat_ws('|','patient_id',F.col('event_time').cast('string')),256))
 .withColumn('glucose_mmol_l',F.round(F.greatest(F.lit(2.2),F.least(F.lit(22.0),F.lit(6.8)+F.sin(F.hour('event_time')*F.lit(3.1415926)/12)*1.4+(F.pmod(F.xxhash64('patient_id','event_time',F.lit(SEED)),F.lit(1000))/1000-.5)*2.4)),1))
 .withColumn('trend',F.element_at(F.array(F.lit('RISING'),F.lit('FLAT'),F.lit('FALLING')),F.expr('CAST(1+pmod(xxhash64(patient_id,event_time),3) AS INT)')))
 .withColumn('device_id',F.concat(F.lit('SYN-DEV-'),F.substring('patient_id',-4,4)))
 .withColumn('source_id',F.lit('SRC-01')).withColumn('ingested_at',F.col('event_time')+F.expr('INTERVAL 30 SECONDS')).withColumn('_run_id',F.lit(RUN_ID)))
(cgm.write.mode('overwrite').partitionBy('_run_id').parquet(f'{ROOT}/SRC-01/cgm_readings'))
print('cgm_readings',cgm.count())

# COMMAND ----------

days=spark.sql(f"SELECT explode(sequence(date'{p.history_start_date}',date'{p.history_end_date}',interval 1 day)) event_date")
log=(patients.select('patient_id').crossJoin(days).where(F.pmod(F.xxhash64('patient_id','event_date',F.lit(6)),F.lit(2))==0)
 .withColumn('entry_id',F.sha2(F.concat_ws('|','patient_id',F.lit('LOG'),F.col('event_date').cast('string')),256))
 .withColumn('event_time',F.col('event_date').cast('timestamp')+F.expr('INTERVAL 12 HOURS'))
 .withColumn('event_type',F.element_at(F.array(*[F.lit(x) for x in ['MEAL','INSULIN','ACTIVITY','NOTE']]),F.expr('CAST(1+pmod(xxhash64(patient_id,event_date),4) AS INT)')))
 .withColumn('carbohydrates_g',(F.lit(20)+F.pmod(F.xxhash64('patient_id','event_date',F.lit(1)),F.lit(80))).cast('int'))
 .withColumn('insulin_units',F.round(F.lit(1.0)+F.pmod(F.xxhash64('patient_id','event_date',F.lit(2)),F.lit(90))/10,1))
 .withColumn('source_application',F.lit('mySugr')).withColumn('source_id',F.lit('SRC-06'))
 .withColumn('ingested_at',F.lit(GENERATED_AT).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID))
 .select('entry_id','patient_id','event_time','event_type','carbohydrates_g','insulin_units','source_application','source_id','ingested_at','_run_id'))
log.write.mode('overwrite').json(f'{ROOT}/SRC-06/mysugr_logbook/{RUN_ID}')
print('mysugr_logbook',log.count())

# COMMAND ----------

device=(patients.select('patient_id').crossJoin(days)
 .withColumn('event_id',F.sha2(F.concat_ws('|','patient_id',F.lit('DEVICE'),F.col('event_date').cast('string')),256))
 .withColumn('device_id',F.concat(F.lit('SYN-DEV-'),F.substring('patient_id',-4,4)))
 .withColumn('event_time',F.col('event_date').cast('timestamp')+F.expr('INTERVAL 23 HOURS'))
 .withColumn('battery_pct',(F.lit(20)+F.pmod(F.xxhash64('patient_id','event_date'),F.lit(81))).cast('int'))
 .withColumn('sync_status',F.when(F.pmod(F.xxhash64('patient_id','event_date',F.lit(9)),F.lit(40))==0,'SYNC_FAILED').otherwise('SYNC_OK'))
 .withColumn('error_code',F.when(F.col('sync_status')=='SYNC_FAILED','E-SYN-01'))
 .withColumn('source_id',F.lit('SRC-16')).withColumn('ingested_at',F.lit(GENERATED_AT).cast('timestamp')).withColumn('_run_id',F.lit(RUN_ID)))
device.write.mode('overwrite').json(f'{ROOT}/SRC-16/device_events/{RUN_ID}')
print('device_events',device.count())