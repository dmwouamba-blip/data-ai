import argparse
import re
from pyspark.sql import SparkSession

CATALOG_RE = re.compile(r"^[A-Za-z0-9_]+$")

TABLES = {
    "bronze.events": "source_event_id STRING, event_type STRING, payload STRING, event_ts TIMESTAMP, ingested_at TIMESTAMP, run_id STRING",
    "silver.patient_residence": "patient_id STRING, city_id STRING, country_code STRING, valid_from DATE, valid_to DATE, residence_status STRING, synthetic_flag BOOLEAN, run_id STRING",
    "silver.nutrition_event": "event_id STRING, patient_id STRING, event_ts TIMESTAMP, food_category STRING, self_reported BOOLEAN, city_id STRING, synthetic_flag BOOLEAN, run_id STRING",
    "silver.glucose_reading": "reading_id STRING, patient_id STRING, reading_ts TIMESTAMP, glucose_mmol_l DOUBLE, city_id STRING, synthetic_flag BOOLEAN, run_id STRING",
    "silver.nutrition_trend": "trend_id STRING, geography_level STRING, city_id STRING, country_code STRING, metric STRING, metric_value DOUBLE, period_start DATE, period_end DATE, source_org STRING, source_version STRING, synthetic_flag BOOLEAN, run_id STRING",
}
SCHEMAS = ["bronze", "silver", "gold", "serving", "monitoring", "quarantine"]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
    args = parser.parse_args()
    if not CATALOG_RE.fullmatch(args.catalog):
        raise ValueError("Invalid catalog identifier")
    c=args.catalog
    spark=SparkSession.builder.getOrCreate()
    spark.sql(f"CREATE CATALOG IF NOT EXISTS `{c}`")
    for schema in SCHEMAS:
        spark.sql(f"CREATE SCHEMA IF NOT EXISTS `{c}`.`{schema}`")
    for name, cols in TABLES.items():
        schema, table = name.split(".", 1)
        spark.sql(f"CREATE TABLE IF NOT EXISTS `{c}`.`{schema}`.`{table}` ({cols}) USING DELTA")
    print(f"DCP objects ready in {c}")

if __name__ == "__main__":
    main()
