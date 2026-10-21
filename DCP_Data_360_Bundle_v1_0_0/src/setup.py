import argparse

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--catalog", default="dcp_dev")

    # Notebook/IPython kann eigene CLI-Argumente mitbringen.
    args, _ = p.parse_known_args()

    c = args.catalog

    print(f"Using catalog: {c}")

    spark.sql(f"CREATE CATALOG IF NOT EXISTS `{c}`")

    schemas = [
        "bronze",
        "silver",
        "gold",
        "serving",
        "monitoring",
        "quarantine",
    ]

    for schema in schemas:
        spark.sql(
            f"CREATE SCHEMA IF NOT EXISTS `{c}`.`{schema}`"
        )

    tables = {
        "bronze.events":
            "source_event_id STRING, event_type STRING, payload STRING, "
            "event_ts TIMESTAMP, ingested_at TIMESTAMP, run_id STRING",

        "silver.patient_residence":
            "patient_id STRING, city_id STRING, country_code STRING, "
            "valid_from DATE, valid_to DATE, residence_status STRING, "
            "synthetic_flag BOOLEAN, run_id STRING",

        "silver.nutrition_event":
            "event_id STRING, patient_id STRING, event_ts TIMESTAMP, "
            "food_category STRING, self_reported BOOLEAN, city_id STRING, "
            "synthetic_flag BOOLEAN, run_id STRING",

        "silver.glucose_reading":
            "reading_id STRING, patient_id STRING, reading_ts TIMESTAMP, "
            "glucose_mmol_l DOUBLE, city_id STRING, "
            "synthetic_flag BOOLEAN, run_id STRING",

        "silver.nutrition_trend":
            "trend_id STRING, geography_level STRING, city_id STRING, "
            "country_code STRING, metric STRING, metric_value DOUBLE, "
            "period_start DATE, period_end DATE, source_org STRING, "
            "source_version STRING, synthetic_flag BOOLEAN, run_id STRING",
    }

    for name, cols in tables.items():
        spark.sql(
            f"CREATE TABLE IF NOT EXISTS `{c}`.{name} "
            f"({cols}) USING DELTA CLUSTER BY AUTO"
        )

    print(f"DCP objects ready in {c}")


if __name__ == "__main__":
    main()