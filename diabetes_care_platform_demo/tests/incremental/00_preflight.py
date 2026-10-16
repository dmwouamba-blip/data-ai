# Databricks notebook source
required=["dcp_synth.00_config.generator_state","dcp_synth.00_config.generator_runs","dcp_synth.00_config.generator_manifest"]
missing=[t for t in required if not spark.catalog.tableExists(t)]
if missing: raise AssertionError("Missing: "+", ".join(missing))
print("PASS incremental preflight")
