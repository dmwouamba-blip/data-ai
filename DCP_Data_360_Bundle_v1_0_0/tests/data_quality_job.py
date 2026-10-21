import argparse
from pyspark.sql import functions as F

def assert_zero(df,msg):
    n=df.count()
    if n: raise AssertionError(f'{msg}: {n}')
def main():
    p=argparse.ArgumentParser();p.add_argument('--catalog',required=True);c=p.parse_args().catalog
    r=spark.table(f'{c}.silver.patient_residence');n=spark.table(f'{c}.silver.nutrition_event');g=spark.table(f'{c}.silver.glucose_reading');t=spark.table(f'{c}.silver.nutrition_trend')
    assert_zero(r.groupBy('patient_id').agg(F.sum(F.when(F.col('residence_status')=='CURRENT',1).otherwise(0)).alias('n')).filter('n>1'),'multiple CURRENT residence periods')
    assert_zero(r.filter(F.col('valid_to')<F.col('valid_from')),'invalid residence period')
    assert_zero(n.filter(F.col('self_reported')!=True),'nutrition event not self-reported')
    assert_zero(g.filter((F.col('glucose_mmol_l')<=0)|F.col('patient_id').isNull()),'invalid glucose')
    assert_zero(t.filter((F.col('metric_value')<0)|(F.col('metric_value')>100)),'invalid benchmark')
    if c.endswith('_prod'):
        for df in [r,n,g,t]: assert_zero(df.filter('synthetic_flag=true'),'synthetic rows in PROD')
    print('Critical DCP quality checks passed')
if __name__=='__main__':main()
