import argparse
import re
from functools import reduce

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F


CATALOG_RE = re.compile(r"^[A-Za-z0-9_]+$")


def validate_catalog(value: str) -> str:
    if not CATALOG_RE.fullmatch(value):
        raise ValueError(f"Invalid catalog identifier: {value!r}")
    return value


def qualified(catalog: str, schema: str, table: str) -> str:
    return f"`{catalog}`.`{schema}`.`{table}`"


def assert_not_empty(df: DataFrame, name: str) -> None:
    if df.limit(1).count() == 0:
        raise RuntimeError(f"Required Silver source is empty: {name}")


def overwrite_delta(df: DataFrame, target: str) -> int:
    row_count = df.count()
    if row_count == 0:
        raise RuntimeError(f"Refusing to overwrite {target} with zero rows")

    (
        df.write
        .format("delta")
        .mode("overwrite")
        .option("overwriteSchema", "true")
        .saveAsTable(target)
    )
    return row_count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
    args = parser.parse_args()

    catalog = validate_catalog(args.catalog)
    spark = SparkSession.builder.getOrCreate()

    residence = spark.table(qualified(catalog, "silver", "patient_residence"))
    glucose = spark.table(qualified(catalog, "silver", "glucose_reading"))
    nutrition = spark.table(qualified(catalog, "silver", "nutrition_event"))
    trends = spark.table(qualified(catalog, "silver", "nutrition_trend"))

    for name, df in [
        ("patient_residence", residence),
        ("glucose_reading", glucose),
        ("nutrition_event", nutrition),
        ("nutrition_trend", trends),
    ]:
        assert_not_empty(df, f"{catalog}.silver.{name}")

    # 1) Patient glucose summary: one business-ready row per patient.
    glucose_summary = (
        glucose
        .groupBy("patient_id")
        .agg(
            F.count("reading_id").alias("reading_count"),
            F.avg("glucose_mmol_l").alias("avg_glucose_mmol_l"),
            F.min("glucose_mmol_l").alias("min_glucose_mmol_l"),
            F.max("glucose_mmol_l").alias("max_glucose_mmol_l"),
            F.max("reading_ts").alias("last_reading_ts"),
        )
    )

    # 2) Patient nutrition summary: one row per patient and food category.
    nutrition_summary = (
        nutrition
        .groupBy("patient_id", "food_category")
        .agg(
            F.count("event_id").alias("event_count"),
            F.max("event_ts").alias("last_event_ts"),
        )
    )

    # 3) Geographic nutrition benchmark: business-facing projection of trend data.
    geographic_nutrition_trend = (
        trends
        .select(
            "trend_id",
            "geography_level",
            "city_id",
            "country_code",
            "metric",
            "metric_value",
            "period_start",
            "period_end",
            "source_org",
            "source_version",
            "synthetic_flag",
            "run_id",
        )
    )

    # 4) Patient 360: one row per patient, joining current residence with
    # aggregate glucose/nutrition indicators.
    residence_ranked = (
        residence
        .withColumn(
            "_rn",
            F.row_number().over(
                __import__("pyspark.sql.window", fromlist=["Window"]).Window
                .partitionBy("patient_id")
                .orderBy(F.col("valid_from").desc_nulls_last())
            ),
        )
        .filter(F.col("_rn") == 1)
        .drop("_rn")
    )

    nutrition_patient = (
        nutrition
        .groupBy("patient_id")
        .agg(
            F.count("event_id").alias("nutrition_event_count"),
            F.countDistinct("food_category").alias("food_category_count"),
            F.max("event_ts").alias("last_nutrition_event_ts"),
        )
    )

    patient_360 = (
        residence_ranked.alias("r")
        .join(glucose_summary.alias("g"), "patient_id", "left")
        .join(nutrition_patient.alias("n"), "patient_id", "left")
        .select(
            "patient_id",
            F.col("r.city_id").alias("city_id"),
            F.col("r.country_code").alias("country_code"),
            F.col("r.residence_status").alias("residence_status"),
            "reading_count",
            "avg_glucose_mmol_l",
            "min_glucose_mmol_l",
            "max_glucose_mmol_l",
            "last_reading_ts",
            "nutrition_event_count",
            "food_category_count",
            "last_nutrition_event_ts",
            F.col("r.synthetic_flag").alias("synthetic_flag"),
            F.col("r.run_id").alias("run_id"),
        )
    )

    outputs = [
        ("patient_glucose_summary", glucose_summary),
        ("patient_nutrition_summary", nutrition_summary),
        ("geographic_nutrition_trend", geographic_nutrition_trend),
        ("patient_360", patient_360),
    ]

    for table, df in outputs:
        target = qualified(catalog, "gold", table)
        count = overwrite_delta(df, target)
        print(f"Gold: wrote {count} rows to {catalog}.gold.{table}")

    print(f"Gold datasets published in {catalog}.gold")


if __name__ == "__main__":
    main()
