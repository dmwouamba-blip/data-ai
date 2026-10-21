-- Risk Activity Tracking Table for ETRM Data 360
-- This table tracks all risk management activities and events in real-time
-- Use this DDL to create the table in Databricks

CREATE TABLE IF NOT EXISTS etrm_data_360.risk_activity_log (
    -- Primary identifiers
    activity_id STRING NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    
    -- Activity classification
    activity_type STRING NOT NULL, -- 'exposure_monitoring', 'limit_breach', 'scenario_analysis', 'stress_test', 'var_calculation', 'hedge_optimization', 'alert_triggered'
    category STRING NOT NULL, -- 'monitoring', 'analysis', 'optimization', 'alert', 'compliance'
    severity STRING NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- Risk context
    product STRING,
    portfolio STRING,
    counterparty STRING,
    location STRING,
    book STRING,
    
    -- Activity details
    description STRING NOT NULL,
    metric_name STRING, -- e.g., 'var_95', 'exposure_limit', 'credit_limit'
    metric_value DOUBLE,
    threshold_value DOUBLE,
    breach_percentage DOUBLE, -- percentage over/under threshold
    
    -- Risk metrics snapshot
    current_exposure DOUBLE,
    exposure_limit DOUBLE,
    var_95 DOUBLE,
    var_99 DOUBLE,
    expected_shortfall DOUBLE,
    
    -- Scenario/Stress test specific
    scenario_name STRING,
    scenario_parameters MAP<STRING, STRING>,
    stress_factor DOUBLE,
    projected_impact DOUBLE,
    
    -- Hedge effectiveness
    hedge_ratio DOUBLE,
    hedge_effectiveness DOUBLE,
    residual_risk DOUBLE,
    hedge_recommendation STRING,
    
    -- User and system context
    user_id STRING,
    system_source STRING, -- 'real_time_monitor', 'batch_calculation', 'user_simulation', 'automated_alert'
    
    -- Status and resolution
    status STRING NOT NULL, -- 'active', 'acknowledged', 'resolved', 'escalated'
    resolution_notes STRING,
    resolved_by STRING,
    resolved_at TIMESTAMP,
    
    -- Additional metadata
    tags ARRAY<STRING>,
    metadata MAP<STRING, STRING>,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
    updated_at TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_risk_activity_timestamp ON etrm_data_360.risk_activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_risk_activity_type ON etrm_data_360.risk_activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_risk_activity_severity ON etrm_data_360.risk_activity_log (severity);
CREATE INDEX IF NOT EXISTS idx_risk_activity_status ON etrm_data_360.risk_activity_log (status);
CREATE INDEX IF NOT EXISTS idx_risk_activity_product ON etrm_data_360.risk_activity_log (product);

-- Sample data insertion for testing
INSERT INTO etrm_data_360.risk_activity_log VALUES
    ('act_001', '2024-01-15 09:30:00', 'limit_breach', 'alert', 'high', 'WTI_Crude', 'Energy_Portfolio', 'Shell', 'Houston', 'Trading_Book_1', 
     'Credit exposure limit breached for Shell counterparty', 'credit_exposure', 15500000.0, 15000000.0, 3.33, 
     15500000.0, 15000000.0, 2500000.0, 3200000.0, 3800000.0, 
     NULL, NULL, NULL, NULL, 
     NULL, NULL, NULL, NULL,
     'trader_001', 'real_time_monitor', 'active', NULL, NULL, NULL,
     array('credit_risk', 'counterparty', 'urgent'), map('region', 'Americas', 'desk', 'Energy'),
     '2024-01-15 09:30:00', '2024-01-15 09:30:00'),
     
    ('act_002', '2024-01-15 10:15:00', 'scenario_analysis', 'analysis', 'medium', 'Natural_Gas', 'Gas_Portfolio', NULL, 'London', 'Trading_Book_2',
     'Stress test scenario: 20% price spike impact analysis', 'portfolio_value', -2800000.0, NULL, NULL,
     8500000.0, 12000000.0, 1800000.0, 2400000.0, 2900000.0,
     'Price_Spike_20pct', map('price_change', '20%', 'volatility_multiplier', '1.5'), 1.2, -2800000.0,
     NULL, NULL, NULL, NULL,
     'risk_manager_002', 'user_simulation', 'resolved', 'Acceptable risk level within tolerance', 'risk_manager_002', '2024-01-15 11:00:00',
     array('stress_test', 'gas', 'scenario'), map('simulation_id', 'sim_20240115_001'),
     '2024-01-15 10:15:00', '2024-01-15 11:00:00'),
     
    ('act_003', '2024-01-15 14:20:00', 'hedge_optimization', 'optimization', 'medium', 'Brent_Crude', 'Oil_Portfolio', NULL, 'Singapore', 'Hedge_Book_1',
     'Hedge effectiveness below threshold, optimization recommended', 'hedge_effectiveness', 0.72, 0.80, -10.0,
     12000000.0, 18000000.0, 3200000.0, 4100000.0, 4800000.0,
     NULL, NULL, NULL, NULL,
     0.85, 0.72, 3360000.0, 'Increase hedge ratio to 0.90 and add volatility hedge',
     'quant_analyst_003', 'automated_alert', 'acknowledged', NULL, NULL, NULL,
     array('hedge', 'optimization', 'oil'), map('current_delta', '0.72', 'target_delta', '0.90'),
     '2024-01-15 14:20:00', '2024-01-15 14:20:00');

-- Create a view for real-time dashboard queries
CREATE OR REPLACE VIEW etrm_data_360.risk_activity_dashboard AS
SELECT 
    activity_id,
    timestamp,
    activity_type,
    category,
    severity,
    product,
    portfolio,
    description,
    metric_name,
    metric_value,
    threshold_value,
    breach_percentage,
    status,
    user_id,
    CASE 
        WHEN timestamp >= current_timestamp() - INTERVAL 1 HOUR THEN 'last_hour'
        WHEN timestamp >= current_timestamp() - INTERVAL 1 DAY THEN 'last_24h'
        WHEN timestamp >= current_timestamp() - INTERVAL 7 DAYS THEN 'last_week'
        ELSE 'older'
    END as time_bucket,
    created_at
FROM etrm_data_360.risk_activity_log
WHERE status IN ('active', 'acknowledged')
ORDER BY timestamp DESC;

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT ON etrm_data_360.risk_activity_log TO `data_analysts`;
-- GRANT SELECT ON etrm_data_360.risk_activity_dashboard TO `risk_managers`;
-- GRANT INSERT, UPDATE ON etrm_data_360.risk_activity_log TO `etrm_application`;
