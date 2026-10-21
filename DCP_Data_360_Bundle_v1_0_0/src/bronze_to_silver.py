import argparse

from pyspark.sql import functions as F
from pyspark.sql import SparkSession


SPECS = {
    "RESIDENCE": {
        "table": "patient_residence",
        "schema": """
            patient_id STRING,
            city_id STRING,
            country_code STRING,
            valid_from DATE,
            valid_to DATE,
            residence_status STRING,
            synthetic_flag BOOLEAN,
            run_id STRING
        """,
        "required": ["patient_id", "city_id"]
    },

    "NUTRITION": {
        "table": "nutrition_event",
        "schema": """
            event_id STRING,
            patient_id STRING,
            event_ts TIMESTAMP,
            food_category STRING,
            self_reported BOOLEAN,
            city_id STRING,
            synthetic_flag BOOLEAN,
            run_id STRING
        """,
        "required": ["event_id", "patient_id", "event_ts"]
    },

    "GLUCOSE": {
        "table": "glucose_reading",
        "schema": """
            reading_id STRING,
            patient_id STRING,
            reading_ts TIMESTAMP,
            glucose_mmol_l DOUBLE,
            city_id STRING,
            synthetic_flag BOOLEAN,
            run_id STRING
        """,
        "required": ["reading_id", "patient_id", "reading_ts"]
    },

    "TREND": {
        "table": "nutrition_trend",
        "schema": """
            trend_id STRING,
            geography_level STRING,
            city_id STRING,
            country_code STRING,
            metric STRING,
            metric_value DOUBLE,
            period_start DATE,
            period_end DATE,
            source_org STRING,
            source_version STRING,
            synthetic_flag BOOLEAN,
            run_id STRING
        """,
        "required": ["trend_id", "metric"]
    }
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True)
    args = parser.parse_args()

    catalog = args.catalog

    spark = SparkSession.getActiveSession()
    if spark is None:
        raise RuntimeError("No active SparkSession")

    source_table = f"`{catalog}`.`bronze`.`events`"

    print(f"Reading Bronze source: {source_table}")

    bronze = spark.table(source_table)

    #
    # Fail early if Bronze does not contain data.
    #
    bronze_count = bronze.count()

    print(f"Bronze records: {bronze_count}")

    if bronze_count == 0:
        raise RuntimeError(
            f"{catalog}.bronze.events contains no data"
        )

    #
    # Diagnostic distribution.
    #
    print("Bronze event types:")

    (
        bronze.groupBy("event_type")
        .count()
        .orderBy("event_type")
        .show(truncate=False)
    )

    for event_type, spec in SPECS.items():

        target_table = spec["table"]
        schema = spec["schema"]
        required = spec["required"]

        target = (
            f"`{catalog}`.`silver`.`{target_table}`"
        )

        print("")
        print("=" * 60)
        print(f"Processing event type: {event_type}")
        print(f"Target: {target}")

        #
        # Extract one logical dataset from generic Bronze.
        #
        source = bronze.filter(
            F.col("event_type") == event_type
        )

        source_count = source.count()

        print(
            f"{event_type}: "
            f"{source_count} Bronze records"
        )

        #
        # Do NOT overwrite an existing Silver table
        # when Bronze contains no records for the type.
        #
        if source_count == 0:
            print(
                f"WARNING: No {event_type} events found. "
                f"Skipping {target_table}."
            )
            continue

        #
        # Parse the JSON contract.
        #
        parsed = (
            source
            .select(
                "source_event_id",
                "payload",
                F.from_json(
                    F.col("payload"),
                    schema,
                    {"mode": "PERMISSIVE"}
                ).alias("data")
            )
        )

        #
        # Detect records where parsing produced no
        # meaningful contract fields.
        #
        required_is_null = None

        for column_name in required:
            condition = F.col(
                f"data.{column_name}"
            ).isNull()

            required_is_null = (
                condition
                if required_is_null is None
                else required_is_null | condition
            )

        invalid = parsed.filter(required_is_null)
        invalid_count = invalid.count()

        if invalid_count > 0:
            print(
                f"WARNING: {invalid_count} "
                f"{event_type} records failed "
                f"required-field validation"
            )

        #
        # Keep valid contract records.
        #
        valid = (
            parsed
            .filter(~required_is_null)
            .select("data.*")
        )

        valid_count = valid.count()

        print(
            f"{event_type}: "
            f"{valid_count} valid Silver records"
        )

        #
        # Guard against accidentally wiping Silver.
        #
        if valid_count == 0:
            raise RuntimeError(
                f"{event_type} has {source_count} Bronze "
                f"records but produced zero valid Silver records. "
                f"Refusing to overwrite {target_table}."
            )

        #
        # Full refresh for current DCP implementation.
        #
        (
            valid.write
            .format("delta")
            .mode("overwrite")
            .option("overwriteSchema", "true")
            .saveAsTable(target)
        )

        written_count = spark.table(target).count()

        print(
            f"{target_table}: "
            f"{written_count} rows written"
        )

        if written_count != valid_count:
            raise RuntimeError(
                f"Validation failed for {target_table}: "
                f"expected {valid_count}, "
                f"found {written_count}"
            )

    print("")
    print(
        f"Bronze -> Silver processing completed "
        f"for catalog {catalog}"
    )


if __name__ == "__main__":
    main()