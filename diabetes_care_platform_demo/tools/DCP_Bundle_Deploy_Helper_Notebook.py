# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "6"
# ///
# MAGIC %md
# MAGIC # DCP Bundle Validate and Deploy
# MAGIC Run from a Databricks notebook attached to a cluster.

# COMMAND ----------

import subprocess
from pathlib import Path

dbutils.widgets.dropdown('target','dev',['dev','prod'],'Target')
dbutils.widgets.dropdown('run_after_deploy','false',['false','true'],'Run workflow after deploy')

TARGET = dbutils.widgets.get('target')
RUN_AFTER = dbutils.widgets.get('run_after_deploy').lower() == 'true'
JOB_KEY = 'dcp_full_platform_deployment'

print('Open Databricks Web Terminal and run:')
print('cd /Workspace/Repos/<user>/data-ai')
print(f'databricks bundle validate -t {TARGET}')
print(f'databricks bundle deploy -t {TARGET}')
if RUN_AFTER:
    print(f'databricks bundle run {JOB_KEY} -t {TARGET}')

# COMMAND ----------

print('Bundle target:', TARGET)
print('Workflow:', JOB_KEY)
print('This notebook is a deployment helper because Databricks recommends executing bundle CLI commands from the Web Terminal.')