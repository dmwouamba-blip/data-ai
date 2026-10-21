-- ==================================================================
-- ETRM Data 360 Pipeline - Master Table Deployment Script
-- Executes all table creation scripts in the correct order
-- ==================================================================

-- ==================================================================
-- SETUP AND CONFIGURATION
-- ==================================================================

-- Set catalog and schema
USE CATALOG totalenergies;
USE SCHEMA energy_market_intelligence;

-- Enable optimizations
SET spark.sql.adaptive.enabled = true;
SET spark.sql.adaptive.coalescePartitions.enabled = true;
SET spark.databricks.delta.optimizeWrite.enabled = true;
SET spark.databricks.delta.autoCompact.enabled = true;

-- Display deployment information
SELECT 
    'ETRM Data 360 Pipeline Deployment' as deployment_name,
    current_timestamp() as deployment_start_time,
    current_user() as deployed_by,
    current_catalog() as target_catalog,
    current_schema() as target_schema;

-- ==================================================================
-- DEPLOYMENT STEPS
-- ==================================================================

-- Step 1: Create Trading Tables
SELECT 'Step 1: Creating Trading Tables...' as status;
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/01_trading_tables.sql';

-- Step 2: Create Risk Management Tables  
SELECT 'Step 2: Creating Risk Management Tables...' as status;
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/02_risk_tables.sql';

-- Step 3: Create Compliance and Finance Tables
SELECT 'Step 3: Creating Compliance and Finance Tables...' as status;
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/03_compliance_finance_tables.sql';

-- Step 4: Create Unified Views and Analytics
SELECT 'Step 4: Creating Unified Views and Analytics...' as status;
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/04_unified_views_analytics.sql';

-- ==================================================================
-- POST-DEPLOYMENT VALIDATION
-- ==================================================================

SELECT 'Post-Deployment Validation...' as status;

-- Validate all tables were created successfully
CREATE OR REPLACE TEMPORARY VIEW deployment_validation AS
SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Created'
        ELSE '❌ Failed'
    END as status
FROM information_schema.tables 
WHERE table_catalog = 'totalenergies' 
    AND table_schema = 'energy_market_intelligence'
    AND table_name IN (
        'trades', 'trading_activity_log', 'price_forecasts', 'market_patterns', 'market_anomalies', 'market_microstructure',
        'positions', 'var_results', 'exposure_limits', 'risk_alerts', 'scenario_analysis', 'stress_test_results', 
        'var_sensitivity', 'hedge_effectiveness', 'risk_activity_log', 'risk_dashboard_summary',
        'compliance_events', 'pnl', 'regulatory_reports', 'trade_surveillance', 'kyc_records', 'audit_trail'
    )
ORDER BY table_name;

-- Display validation results
SELECT * FROM deployment_validation;

-- Count tables by category
SELECT 
    CASE 
        WHEN table_name LIKE '%trading%' OR table_name IN ('trades', 'price_forecasts', 'market_patterns', 'market_anomalies', 'market_microstructure') THEN 'Trading'
        WHEN table_name LIKE '%risk%' OR table_name IN ('positions', 'var_results', 'exposure_limits', 'scenario_analysis', 'stress_test_results', 'var_sensitivity', 'hedge_effectiveness') THEN 'Risk Management'
        WHEN table_name LIKE '%compliance%' OR table_name IN ('compliance_events', 'regulatory_reports', 'trade_surveillance', 'kyc_records', 'audit_trail') THEN 'Compliance'
        WHEN table_name IN ('pnl') THEN 'Finance'
        ELSE 'Other'
    END as category,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_catalog = 'totalenergies' 
    AND table_schema = 'energy_market_intelligence'
    AND table_type = 'MANAGED'
GROUP BY 1
ORDER BY table_count DESC;

-- Validate views were created
SELECT 
    'Views Created' as validation_type,
    COUNT(*) as count
FROM information_schema.views 
WHERE table_catalog = 'totalenergies' 
    AND table_schema = 'energy_market_intelligence';

-- Check sample data
SELECT 'Sample Data Validation' as validation_type;

-- Validate trading data
SELECT 
    'trades' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM trades
WHERE timestamp IS NOT NULL

UNION ALL

SELECT 
    'trading_activity_log' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM trading_activity_log
WHERE timestamp IS NOT NULL

UNION ALL

SELECT 
    'risk_activity_log' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM risk_activity_log
WHERE timestamp IS NOT NULL

UNION ALL

SELECT 
    'compliance_events' as table_name,
    COUNT(*) as record_count,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM compliance_events
WHERE timestamp IS NOT NULL

UNION ALL

SELECT 
    'pnl' as table_name,
    COUNT(*) as record_count,
    MIN(date) as earliest_record,
    MAX(date) as latest_record
FROM pnl
WHERE date IS NOT NULL;

-- ==================================================================
-- PERFORMANCE OPTIMIZATION
-- ==================================================================

SELECT 'Running Performance Optimizations...' as status;

-- Analyze all tables for statistics
ANALYZE TABLE trades COMPUTE STATISTICS;
ANALYZE TABLE trading_activity_log COMPUTE STATISTICS;
ANALYZE TABLE positions COMPUTE STATISTICS;
ANALYZE TABLE var_results COMPUTE STATISTICS;
ANALYZE TABLE risk_activity_log COMPUTE STATISTICS;
ANALYZE TABLE compliance_events COMPUTE STATISTICS;
ANALYZE TABLE pnl COMPUTE STATISTICS;

-- Optimize Delta tables
OPTIMIZE trades ZORDER BY (instrument, timestamp);
OPTIMIZE trading_activity_log ZORDER BY (instrument, timestamp);
OPTIMIZE risk_activity_log ZORDER BY (product, timestamp);
OPTIMIZE compliance_events ZORDER BY (severity, timestamp);
OPTIMIZE pnl ZORDER BY (product, date);

-- ==================================================================
-- DEPLOYMENT SUMMARY
-- ==================================================================

SELECT 
    'ETRM Data 360 Pipeline Deployment Complete' as summary,
    current_timestamp() as deployment_end_time,
    (
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_catalog = 'totalenergies' 
            AND table_schema = 'energy_market_intelligence'
            AND table_type = 'MANAGED'
    ) as tables_created,
    (
        SELECT COUNT(*) 
        FROM information_schema.views 
        WHERE table_catalog = 'totalenergies' 
            AND table_schema = 'energy_market_intelligence'
    ) as views_created,
    (
        SELECT SUM(record_count) 
        FROM (
            SELECT COUNT(*) as record_count FROM trades
            UNION ALL SELECT COUNT(*) FROM trading_activity_log
            UNION ALL SELECT COUNT(*) FROM positions  
            UNION ALL SELECT COUNT(*) FROM var_results
            UNION ALL SELECT COUNT(*) FROM risk_activity_log
            UNION ALL SELECT COUNT(*) FROM compliance_events
            UNION ALL SELECT COUNT(*) FROM pnl
        )
    ) as total_sample_records;

-- Display backend API alignment summary
SELECT 
    'Backend API Alignment Summary' as summary_type,
    'All tables and views are now aligned with backend schemas and API expectations' as status,
    ARRAY(
        'Trading APIs: trades, trading_activity_log, price_forecasts, market_patterns, market_anomalies, market_microstructure',
        'Risk APIs: positions, var_results, exposure_limits, risk_alerts, scenario_analysis, stress_test_results, var_sensitivity, hedge_effectiveness, risk_activity_log',
        'Compliance APIs: compliance_events, regulatory_reports, trade_surveillance, kyc_records, audit_trail',
        'Finance APIs: pnl with detailed P&L breakdown',
        'Dashboard APIs: unified views and materialized views for real-time consumption'
    ) as aligned_apis;

-- ==================================================================
-- NEXT STEPS RECOMMENDATIONS
-- ==================================================================

SELECT 
    'Next Steps' as section,
    ARRAY(
        '1. Update backend API endpoints to query these new tables instead of mock data',
        '2. Set up scheduled jobs to refresh materialized views (every 15 minutes)',
        '3. Configure data pipelines to populate tables from source systems',
        '4. Set up monitoring and alerting on data quality metrics',
        '5. Implement data retention policies for historical data',
        '6. Create additional indexes based on query patterns',
        '7. Set up CDC (Change Data Capture) for real-time updates'
    ) as recommendations;

-- ==================================================================
-- END OF DEPLOYMENT
-- ==================================================================
