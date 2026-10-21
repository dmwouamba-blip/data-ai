import argparse
from pyspark.sql import SparkSession, functions as F

SPECS = {
    "RESIDENCE": ("patient_residence", "patient_id string,city_id string,country_code string,valid_from date,valid_to date,residence_status string,synthetic_flag boolean,run_id string", ["patient_id","city_id"]),
    "NUTRITION": ("nutrition_event", "event_id string,patient_id string,event_ts timestamp,food_category string,self_reported boolean,city_id string,synthetic_flag boolean,run_id string", ["event_id","patient_id","event_ts"]),
    "GLUCOSE": ("glucose_reading", "reading_id string,patient_id string,reading_ts timestamp,glucose_mmol_l double,city_id string,synthetic_flag boolean,run_id string", ["reading_id","patient_id","reading_ts"]),
    "TREND": ("nutrition_trend", "trend_id string,geography_level string,city_id string,country_code string,metric string,metric_value double,period_start date,period_end date,source_org string,source_version string,synthetic_flag boolean,run_id string", ["trend_id","metric"]),
}

def main():
    p=argparse.ArgumentParser(); p.add_argument("--catalog", required=True); a=p.parse_args()
    spark=SparkSession.builder.getOrCreate(); c=a.catalog
    bronze=spark.table(f"`{c}`.`bronze`.`events`")
    if bronze.limit(1).count() == 0:
        raise RuntimeError(f"{c}.bronze.events is empty")
    bronze.groupBy("event_type").count().orderBy("event_type").show(truncate=False)
    for event_type,(table,schema,required) in SPECS.items():
        source=bronze.filter(F.col("event_type") == event_type)
        if source.limit(1).count() == 0:
            print(f"WARNING: no {event_type} events; preserving existing silver.{table}")
            continue
        parsed=source.select(F.from_json(F.col("payload"), schema, {"mode":"PERMISSIVE"}).alias("d")).select("d.*")
        condition=None
        for col_name in required:
            q=F.col(col_name).isNotNull()
            condition=q if condition is None else condition & q
        valid=parsed.filter(condition)
        valid_count=valid.count()
        if valid_count == 0:
            raise RuntimeError(f"{event_type}: Bronze rows exist but zero rows match the Silver contract")
        target=f"`{c}`.`silver`.`{table}`"
        valid.write.format("delta").mode("overwrite").option("overwriteSchema","true").saveAsTable(target)
        print(f"{event_type}: wrote {valid_count} rows to {c}.silver.{table}")
    print(f"Silver datasets refreshed in {c}")

if __name__ == "__main__":
    main()
