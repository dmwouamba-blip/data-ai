USE CATALOG dcp_synth;
CREATE OR REPLACE TABLE `00_config`.source_catalog (
 source_id STRING, source_name STRING, domain STRING, source_type STRING,
 format_protocol STRING, cadence STRING, target_table STRING,
 classification STRING, owner_role STRING, test_data_method STRING,
 implementation_status STRING
) USING DELTA;
INSERT OVERWRITE `00_config`.source_catalog VALUES
('SRC-01','CGM Readings','Glucose','Device','Parquet','5 minutes','dcp_synth.01_bronze.cgm_readings','Highly Restricted','Glucose Data Owner','Deterministic time series','IMPLEMENTED'),
('SRC-06','mySugr Logbook','Patient Events','Application','JSON','Daily sample','dcp_synth.01_bronze.mysugr_logbook','Highly Restricted','Patient App Owner','Deterministic logbook','IMPLEMENTED'),
('SRC-11','Patient Master','Patient','Master Data','CSV','Daily','dcp_synth.01_bronze.patient_master','Highly Restricted','Patient MDM Owner','Synthetic identities','IMPLEMENTED'),
('SRC-14','Consent Events','Privacy','Application','JSON','Event','dcp_synth.01_bronze.consent_events','Highly Restricted','Privacy Owner','Lifecycle events','IMPLEMENTED'),
('SRC-15','Consent Propagation','Privacy','Platform','JSON','Event','dcp_synth.01_bronze.consent_propagation','Restricted','Privacy Operations','Target states','IMPLEMENTED'),
('SRC-16','Device Registry and Sync','Device','Platform','JSON','Daily','dcp_synth.01_bronze.device_events','Highly Restricted','Device Platform Owner','Device states','IMPLEMENTED'),
('SRC-21','Submission Tracking','Regulatory','RIM','JSON','Daily','dcp_synth.06_regulatory.submission_master','Restricted','Regulatory Operations','Submission master','IMPLEMENTED'),
('SRC-23','Product Master','Regulatory Product','SAP','JSON','Daily','dcp_synth.06_regulatory.product_master','Restricted','Product Master Owner','Regulated products','IMPLEMENTED'),
('SRC-24','Authority Interactions','Regulatory','RIM/CRM','JSON','Daily','dcp_synth.06_regulatory.authority_interactions','Restricted','Regulatory Affairs','Authority interactions','IMPLEMENTED'),
('SRC-25','Compliance QMS','Compliance','QMS/GRC','CSV/JSON','Daily','dcp_synth.05_compliance.controls','Restricted','Compliance Owner','Controls and assessments','IMPLEMENTED');
