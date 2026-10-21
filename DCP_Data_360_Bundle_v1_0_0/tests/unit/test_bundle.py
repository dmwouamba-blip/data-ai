from pathlib import Path
import yaml

def test_yaml():
    for p in ['databricks.yml','resources/app.yml','resources/jobs.yml','app/app.yaml']: assert yaml.safe_load(Path(p).read_text())
def test_dag():
    y=yaml.safe_load(Path('resources/jobs.yml').read_text()); assert [x['task_key'] for x in y['resources']['jobs']['dcp_pipeline']['tasks']]==['setup','generate_synthetic','transform','quality','publish','grant_app_access']
def test_prod_synthetic_off(): assert yaml.safe_load(Path('databricks.yml').read_text())['targets']['prod']['variables']['synthetic_enabled']=='false'
def test_synthetic_guard(): assert 'forbidden outside _dev/_synth' in Path('synthetic/generate.py').read_text()
def test_parameterized_patient_queries(): assert 'patient_id=?' in Path('app/backend/main.py').read_text()
