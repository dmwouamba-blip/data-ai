import argparse,json,random,uuid
from datetime import datetime,timedelta,timezone
from delta.tables import DeltaTable

def flag(v): return str(v).lower() in {'1','true','yes'}
def main():
    p=argparse.ArgumentParser();p.add_argument('--catalog',required=True);p.add_argument('--enabled',default='false');p.add_argument('--seed',type=int,default=42);p.add_argument('--reference-ts',required=True);a=p.parse_args()
    if not flag(a.enabled): print('Synthetic generation disabled'); return
    if not (a.catalog.endswith('_dev') or a.catalog.endswith('_synth')): raise RuntimeError('Synthetic generation forbidden outside _dev/_synth')
    ref=datetime.fromisoformat(a.reference_ts); ref=ref if ref.tzinfo else ref.replace(tzinfo=timezone.utc); rng=random.Random(a.seed)
    run=str(uuid.uuid5(uuid.NAMESPACE_URL,f'dcp|{a.catalog}|{a.seed}|{ref.isoformat()}')); rows=[]
    cities=[('CH-ZRH','CH'),('CH-BSL','CH'),('CH-LSN','CH'),('DE-BER','DE'),('FR-PAR','FR')]
    for i in range(1,101):
        pid=f'SYN-P-{i:06d}'; past=cities[i%5]; current=cities[(i+1)%5]; planned=cities[(i+2)%5]
        for j,(city,country,status,start,end) in enumerate([(past[0],past[1],'PAST',-365,-220),(current[0],current[1],'CURRENT',-219,None),(planned[0],planned[1],'PLANNED',60,None)]):
            eid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'{run}|res|{pid}|{j}')); payload={'patient_id':pid,'city_id':city,'country_code':country,'valid_from':str(ref.date()+timedelta(days=start)),'valid_to':str(ref.date()+timedelta(days=end)) if end else None,'residence_status':status,'synthetic_flag':True,'run_id':run}; rows.append((eid,'RESIDENCE',json.dumps(payload),ref,ref,run))
        for j in range(60):
            ts=ref-timedelta(days=rng.randint(0,364),minutes=rng.randint(0,1439)); eid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'{run}|glu|{pid}|{j}')); payload={'reading_id':eid,'patient_id':pid,'reading_ts':ts.isoformat(),'glucose_mmol_l':round(rng.uniform(3.5,13.5),1),'city_id':current[0],'synthetic_flag':True,'run_id':run}; rows.append((eid,'GLUCOSE',json.dumps(payload),ts,ref,run))
        for j in range(24):
            ts=ref-timedelta(days=rng.randint(0,364)); eid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'{run}|nut|{pid}|{j}')); payload={'event_id':eid,'patient_id':pid,'event_ts':ts.isoformat(),'food_category':rng.choice(['VEGETABLE_RICH','WHOLE_GRAIN','SUGARED_DRINK','LATE_MEAL']),'self_reported':True,'city_id':current[0],'synthetic_flag':True,'run_id':run}; rows.append((eid,'NUTRITION',json.dumps(payload),ts,ref,run))
    for city,country in cities:
        for metric in ['VEGETABLE_RICH','WHOLE_GRAIN','SUGARED_DRINK','LATE_MEAL']:
            eid=str(uuid.uuid5(uuid.NAMESPACE_URL,f'{run}|trend|{city}|{metric}')); payload={'trend_id':eid,'geography_level':'CITY','city_id':city,'country_code':country,'metric':metric,'metric_value':round(rng.uniform(15,70),1),'period_start':str(ref.date()-timedelta(days=365)),'period_end':str(ref.date()),'source_org':'SYNTHETIC_BENCHMARK','source_version':'v1','synthetic_flag':True,'run_id':run}; rows.append((eid,'TREND',json.dumps(payload),ref,ref,run))
    df=spark.createDataFrame(rows,['source_event_id','event_type','payload','event_ts','ingested_at','run_id'])
    DeltaTable.forName(spark,f'{a.catalog}.bronze.events').alias('t').merge(df.alias('s'),'t.source_event_id=s.source_event_id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute(); print('events',df.count())
if __name__=='__main__': main()
