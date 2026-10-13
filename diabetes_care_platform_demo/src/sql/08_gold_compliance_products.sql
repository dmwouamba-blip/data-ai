USE CATALOG dcp_synth;
CREATE OR REPLACE VIEW `03_gold`.dp15_healthcare_compliance_monitoring AS SELECT c.control_id,c.domain,c.control_objective,c.owner,c.lifecycle_status,a.assessment_id,CAST(a.assessed_at AS DATE) assessed_at,a.result,a.approval_status,c._run_id FROM `05_compliance`.controls c JOIN `05_compliance`.control_assessments a ON c.control_id=a.control_id;
