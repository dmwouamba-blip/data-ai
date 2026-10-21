import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", default="dcp_dev")

    # Notebook/IPython-kompatibel
    args, _ = parser.parse_known_args()
    c = args.catalog

    views = [
        f"""
        CREATE OR REPLACE VIEW `{c}`.`serving`.`v_patient_selector` AS
        SELECT DISTINCT patient_id
        FROM `{c}`.`silver`.`glucose_reading`
        """,

        f"""
        CREATE OR REPLACE VIEW `{c}`.`serving`.`v_patient_cities` AS
        SELECT *
        FROM `{c}`.`silver`.`patient_residence`
        """,

        f"""
        CREATE OR REPLACE VIEW `{c}`.`serving`.`v_glucose_timeline` AS
        SELECT
            patient_id,
            reading_ts,
            glucose_mmol_l,
            city_id
        FROM `{c}`.`silver`.`glucose_reading`
        """,

        f"""
        CREATE OR REPLACE VIEW `{c}`.`serving`.`v_nutrition_comparison` AS
        SELECT
            n.patient_id,
            n.city_id,
            n.food_category,
            COUNT(*) AS patient_events,
            MAX(t.metric_value) AS city_benchmark
        FROM `{c}`.`silver`.`nutrition_event` n
        LEFT JOIN `{c}`.`silver`.`nutrition_trend` t
            ON n.city_id = t.city_id
            AND n.food_category = t.metric
        GROUP BY
            n.patient_id,
            n.city_id,
            n.food_category
        """,

        f"""
        CREATE OR REPLACE VIEW `{c}`.`serving`.`v_source_health` AS
        SELECT
            event_type AS dataset,
            COUNT(*) AS record_count,
            MAX(event_ts) AS last_event_ts
        FROM `{c}`.`bronze`.`events`
        GROUP BY event_type
        """
    ]

    for statement in views:
        spark.sql(statement)

    print(f"Serving views published in {c}.serving")


if __name__ == "__main__":
    main()