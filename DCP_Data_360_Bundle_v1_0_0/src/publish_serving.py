import argparse
from pyspark.sql import SparkSession

def main():
    p=argparse.ArgumentParser(); p.add_argument("--catalog", required=True); a=p.parse_args(); c=a.catalog
    spark=SparkSession.builder.getOrCreate()
    views={
      "v_patient_selector": f"SELECT DISTINCT patient_id FROM `{c}`.`silver`.`glucose_reading`",
      "v_patient_cities": f"SELECT * FROM `{c}`.`silver`.`patient_residence`",
      "v_glucose_timeline": f"SELECT patient_id, reading_ts, glucose_mmol_l, city_id FROM `{c}`.`silver`.`glucose_reading`",
      "v_nutrition_comparison": f"SELECT n.patient_id,n.city_id,n.food_category,COUNT(*) AS patient_events,MAX(t.metric_value) AS city_benchmark FROM `{c}`.`silver`.`nutrition_event` n LEFT JOIN `{c}`.`silver`.`nutrition_trend` t ON n.city_id=t.city_id AND n.food_category=t.metric GROUP BY n.patient_id,n.city_id,n.food_category",
      "v_source_health": f"SELECT event_type AS dataset,COUNT(*) AS record_count,MAX(event_ts) AS last_event_ts FROM `{c}`.`bronze`.`events` GROUP BY event_type",
    }
    for name,query in views.items():
        spark.sql(f"CREATE OR REPLACE VIEW `{c}`.`serving`.`{name}` AS {query}")
        print(f"Published {c}.serving.{name}")
    print(f"Serving views published in {c}.serving")

if __name__ == "__main__":
    main()
