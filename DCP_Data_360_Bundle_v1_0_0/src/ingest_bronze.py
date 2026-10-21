import argparse
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from pyspark.sql import SparkSession

FOODS = ["vegetables", "fruit", "whole_grains", "protein"]
CITIES = [("ZRH", "CH"), ("BSL", "CH")]

def as_bool(value):
    return value.strip().lower() in {"1", "true", "yes", "y"}

def iso(dt):
    return dt.astimezone(timezone.utc).isoformat()

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--catalog", required=True)
    p.add_argument("--synthetic-enabled", required=True)
    p.add_argument("--synthetic-seed", type=int, required=True)
    p.add_argument("--reference-ts", required=True)
    a=p.parse_args()
    if not as_bool(a.synthetic_enabled):
        print("Synthetic ingestion disabled; no Bronze data generated.")
        return
    random.seed(a.synthetic_seed)
    ref=datetime.fromisoformat(a.reference_ts.replace("Z", "+00:00"))
    if ref.tzinfo is None:
        ref=ref.replace(tzinfo=timezone.utc)
    run_id=str(uuid.uuid4())
    ingested=ref
    rows=[]
    def add(event_type, payload, event_ts):
        rows.append((str(uuid.uuid4()), event_type, json.dumps(payload), event_ts, ingested, run_id))
    patients=[f"SYN-P-{i:06d}" for i in range(1, 11)]
    for i,pid in enumerate(patients):
        city,country=CITIES[i % len(CITIES)]
        add("RESIDENCE", {"patient_id":pid,"city_id":city,"country_code":country,"valid_from":"2026-01-01","valid_to":None,"residence_status":"active","synthetic_flag":True,"run_id":run_id}, ref)
        for j in range(6):
            ts=ref-timedelta(days=j*7, hours=i)
            add("GLUCOSE", {"reading_id":str(uuid.uuid4()),"patient_id":pid,"reading_ts":iso(ts),"glucose_mmol_l":round(random.uniform(4.0,9.0),2),"city_id":city,"synthetic_flag":True,"run_id":run_id}, ts)
            food=FOODS[(i+j) % len(FOODS)]
            add("NUTRITION", {"event_id":str(uuid.uuid4()),"patient_id":pid,"event_ts":iso(ts),"food_category":food,"self_reported":True,"city_id":city,"synthetic_flag":True,"run_id":run_id}, ts)
    for city,country in CITIES:
        for food in FOODS:
            add("TREND", {"trend_id":str(uuid.uuid4()),"geography_level":"city","city_id":city,"country_code":country,"metric":food,"metric_value":round(random.uniform(20,80),2),"period_start":"2026-01-01","period_end":"2026-09-30","source_org":"DCP_SYNTHETIC","source_version":"1.0.0","synthetic_flag":True,"run_id":run_id}, ref)
    spark=SparkSession.builder.getOrCreate()
    schema="source_event_id string, event_type string, payload string, event_ts timestamp, ingested_at timestamp, run_id string"
    df=spark.createDataFrame(rows, schema=schema)
    target=f"`{a.catalog}`.`bronze`.`events`"
    df.write.format("delta").mode("append").saveAsTable(target)
    print(f"Bronze ingest complete: {len(rows)} synthetic events appended to {a.catalog}.bronze.events")

if __name__ == "__main__":
    main()
