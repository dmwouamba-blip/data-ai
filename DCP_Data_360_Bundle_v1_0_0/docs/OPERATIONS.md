# Operations
Pipeline order: setup, generate/ingest, transform, quality, publish, grant app access. Any quality failure blocks publication. Monitor job failures, freshness, row counts, synthetic leakage, warehouse availability, serving latency and app health. Roll back by redeploying the last approved immutable release, not by deleting patient data.
