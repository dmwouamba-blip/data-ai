-- ==================================================================
-- Risk Management Tables for ETRM Data 360 Pipeline
-- Aligned with backend schemas and API expectations
-- ==================================================================

-- Set catalog and schema
USE CATALOG totalenergies;
USE SCHEMA energy_market_intelligence;

-- ==================================================================
-- 1. POSITIONS TABLE (matches backend Position schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS positions (
    position_id STRING NOT NULL,
    date STRING NOT NULL, -- ISO date format
    product STRING NOT NULL,
    quantity DOUBLE NOT NULL,
    
    -- Additional fields for enhanced position tracking
    portfolio STRING,
    counterparty STRING,
    location STRING,
    book STRING,
    currency STRING DEFAULT 'USD',
    market_value DOUBLE,
    unrealized_pnl DOUBLE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'pipeline'
)
USING DELTA
PARTITIONED BY (DATE(date), product)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 2. VAR RESULTS TABLE (matches backend VarResult schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS var_results (
    var_id STRING NOT NULL,
    date STRING NOT NULL, -- ISO date format
    product STRING NOT NULL,
    var_95 DOUBLE NOT NULL,
    var_99 DOUBLE NOT NULL,
    
    -- Additional VaR metrics
    portfolio STRING,
    expected_shortfall DOUBLE,
    confidence_level DOUBLE DEFAULT 0.95,
    calculation_method STRING, -- 'historical', 'parametric', 'monte_carlo'
    time_horizon_days INT DEFAULT 1,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'risk_engine'
)
USING DELTA
PARTITIONED BY (DATE(date), product)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 3. EXPOSURE LIMITS TABLE (matches backend ExposureLimit schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS exposure_limits (
    limit_id STRING NOT NULL,
    product STRING NOT NULL,
    portfolio STRING NOT NULL,
    limit_type STRING NOT NULL, -- 'market', 'credit', 'concentration'
    current_exposure DOUBLE NOT NULL,
    limit_value DOUBLE NOT NULL,
    utilization_pct DOUBLE NOT NULL,
    status STRING NOT NULL, -- 'ok', 'warning', 'breach'
    last_updated STRING NOT NULL, -- ISO datetime format
    
    -- Additional limit details
    currency STRING DEFAULT 'USD',
    counterparty STRING,
    location STRING,
    breach_threshold_pct DOUBLE DEFAULT 90.0,
    warning_threshold_pct DOUBLE DEFAULT 80.0,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'risk_monitor'
)
USING DELTA
PARTITIONED BY (product, portfolio)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 4. RISK ALERTS TABLE (matches backend RiskAlert schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS risk_alerts (
    alert_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    severity STRING NOT NULL, -- 'low', 'medium', 'high', 'critical'
    alert_type STRING NOT NULL,
    product STRING NOT NULL,
    description STRING NOT NULL,
    current_value DOUBLE NOT NULL,
    threshold_value DOUBLE NOT NULL,
    status STRING NOT NULL, -- 'active', 'acknowledged', 'resolved'
    
    -- Additional alert context
    portfolio STRING,
    counterparty STRING,
    location STRING,
    breach_percentage DOUBLE,
    escalation_level INT DEFAULT 1,
    assigned_to STRING,
    resolution_notes STRING,
    resolved_at STRING, -- ISO datetime format
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'alert_system'
)
USING DELTA
PARTITIONED BY (DATE(timestamp), severity)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 5. SCENARIO ANALYSIS TABLE (matches backend ScenarioAnalysis schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS scenario_analysis (
    scenario_id STRING NOT NULL,
    scenario_name STRING NOT NULL,
    description STRING NOT NULL,
    parameters STRING NOT NULL, -- JSON string of parameters
    base_portfolio_value DOUBLE NOT NULL,
    stressed_portfolio_value DOUBLE NOT NULL,
    impact_amount DOUBLE NOT NULL,
    impact_percentage DOUBLE NOT NULL,
    created_at STRING NOT NULL, -- ISO datetime format
    
    -- Additional scenario details
    portfolio STRING,
    scenario_type STRING, -- 'stress_test', 'what_if', 'regulatory'
    confidence_level DOUBLE DEFAULT 0.95,
    time_horizon_days INT DEFAULT 1,
    status STRING DEFAULT 'completed', -- 'running', 'completed', 'failed'
    
    -- Audit fields
    created_timestamp TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'scenario_engine'
)
USING DELTA
PARTITIONED BY (DATE(created_at))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 6. STRESS TEST RESULTS TABLE (matches backend StressTestResult schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS stress_test_results (
    test_id STRING NOT NULL,
    test_name STRING NOT NULL,
    stress_factor DOUBLE NOT NULL,
    product STRING NOT NULL,
    portfolio STRING NOT NULL,
    base_var DOUBLE NOT NULL,
    stressed_var DOUBLE NOT NULL,
    var_change_pct DOUBLE NOT NULL,
    projected_loss DOUBLE NOT NULL,
    confidence_level DOUBLE NOT NULL,
    
    -- Additional test details
    test_date STRING, -- ISO date format
    test_type STRING, -- 'regulatory', 'internal', 'ad_hoc'
    scenario_description STRING,
    passed BOOLEAN,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'stress_test_engine'
)
USING DELTA
PARTITIONED BY (DATE(test_date))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 7. VAR SENSITIVITY TABLE (matches backend VarSensitivity schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS var_sensitivity (
    sensitivity_id STRING NOT NULL,
    product STRING NOT NULL,
    portfolio STRING NOT NULL,
    var_95 DOUBLE NOT NULL,
    var_99 DOUBLE NOT NULL,
    expected_shortfall DOUBLE NOT NULL,
    price_sensitivity DOUBLE NOT NULL,
    volatility_sensitivity DOUBLE NOT NULL,
    correlation_sensitivity DOUBLE NOT NULL,
    duration_risk DOUBLE,
    
    -- Additional sensitivity metrics
    calculation_date STRING, -- ISO date format
    gamma_sensitivity DOUBLE,
    vega_sensitivity DOUBLE,
    theta_sensitivity DOUBLE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'sensitivity_engine'
)
USING DELTA
PARTITIONED BY (DATE(calculation_date), product)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 8. HEDGE EFFECTIVENESS TABLE (matches backend HedgeEffectiveness schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS hedge_effectiveness (
    hedge_id STRING NOT NULL,
    product STRING NOT NULL,
    portfolio STRING NOT NULL,
    hedge_instrument STRING NOT NULL,
    hedge_ratio DOUBLE NOT NULL,
    effectiveness_ratio DOUBLE NOT NULL,
    residual_risk DOUBLE NOT NULL,
    hedge_cost DOUBLE NOT NULL,
    recommendation STRING NOT NULL,
    optimal_ratio DOUBLE,
    
    -- Additional hedge details
    hedge_start_date STRING, -- ISO date format
    hedge_end_date STRING, -- ISO date format
    hedge_type STRING, -- 'cash_flow', 'fair_value', 'net_investment'
    effectiveness_test_method STRING,
    last_test_date STRING, -- ISO date format
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'hedge_monitor'
)
USING DELTA
PARTITIONED BY (product, portfolio)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 9. RISK ACTIVITY LOG TABLE (matches backend RiskActivity schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS risk_activity_log (
    activity_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    activity_type STRING NOT NULL,
    category STRING NOT NULL,
    severity STRING NOT NULL,
    product STRING,
    portfolio STRING,
    description STRING NOT NULL,
    metric_name STRING,
    metric_value DOUBLE,
    threshold_value DOUBLE,
    status STRING NOT NULL,
    user_id STRING,
    tags ARRAY<STRING>,
    
    -- Additional activity context
    counterparty STRING,
    location STRING,
    book STRING,
    breach_percentage DOUBLE,
    scenario_name STRING,
    scenario_parameters STRING, -- JSON string
    resolution_notes STRING,
    resolved_by STRING,
    resolved_at STRING, -- ISO datetime format
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'risk_monitor'
)
USING DELTA
PARTITIONED BY (DATE(timestamp), activity_type)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 10. RISK DASHBOARD SUMMARY TABLE (matches backend RiskDashboardSummary schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS risk_dashboard_summary (
    summary_id STRING NOT NULL,
    calculation_date STRING NOT NULL, -- ISO date format
    total_exposure DOUBLE NOT NULL,
    total_var_95 DOUBLE NOT NULL,
    total_var_99 DOUBLE NOT NULL,
    active_alerts INT NOT NULL,
    critical_alerts INT NOT NULL,
    portfolio_count INT NOT NULL,
    hedge_effectiveness_avg DOUBLE NOT NULL,
    last_updated STRING NOT NULL, -- ISO datetime format
    
    -- Additional summary metrics
    total_positions INT,
    total_trades_today INT,
    avg_risk_score DOUBLE,
    max_single_exposure DOUBLE,
    currency STRING DEFAULT 'USD',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'dashboard_aggregator'
)
USING DELTA
PARTITIONED BY (DATE(calculation_date))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- Create indexes for better query performance
-- ==================================================================

CREATE INDEX IF NOT EXISTS idx_positions_date_product ON positions (date, product);
CREATE INDEX IF NOT EXISTS idx_var_results_date_product ON var_results (date, product);
CREATE INDEX IF NOT EXISTS idx_exposure_limits_product_portfolio ON exposure_limits (product, portfolio);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_timestamp_severity ON risk_alerts (timestamp, severity);
CREATE INDEX IF NOT EXISTS idx_scenario_analysis_created_at ON scenario_analysis (created_at);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_test_date ON stress_test_results (test_date);
CREATE INDEX IF NOT EXISTS idx_var_sensitivity_calculation_date ON var_sensitivity (calculation_date);
CREATE INDEX IF NOT EXISTS idx_hedge_effectiveness_product_portfolio ON hedge_effectiveness (product, portfolio);
CREATE INDEX IF NOT EXISTS idx_risk_activity_timestamp_type ON risk_activity_log (timestamp, activity_type);
CREATE INDEX IF NOT EXISTS idx_risk_dashboard_summary_calculation_date ON risk_dashboard_summary (calculation_date);

-- ==================================================================
-- Create views for API consumption
-- ==================================================================

-- View for current positions (matches API response format)
CREATE OR REPLACE VIEW v_current_positions AS
SELECT 
    date,
    product,
    quantity,
    portfolio,
    market_value,
    unrealized_pnl
FROM positions
WHERE date = (SELECT MAX(date) FROM positions)
ORDER BY product;

-- View for latest VaR results (matches API response format)
CREATE OR REPLACE VIEW v_latest_var_results AS
SELECT 
    date,
    product,
    var_95,
    var_99,
    expected_shortfall,
    portfolio
FROM var_results
WHERE date = (SELECT MAX(date) FROM var_results)
ORDER BY var_95 DESC;

-- View for active risk alerts (matches API response format)
CREATE OR REPLACE VIEW v_active_risk_alerts AS
SELECT 
    alert_id,
    timestamp,
    severity,
    alert_type,
    product,
    description,
    current_value,
    threshold_value,
    status,
    portfolio
FROM risk_alerts
WHERE status IN ('active', 'acknowledged')
ORDER BY severity DESC, timestamp DESC;

-- View for current exposure limits (matches API response format)
CREATE OR REPLACE VIEW v_current_exposure_limits AS
SELECT 
    product,
    portfolio,
    limit_type,
    current_exposure,
    limit_value,
    utilization_pct,
    status,
    last_updated
FROM exposure_limits
ORDER BY utilization_pct DESC;

-- View for recent risk activities (matches API response format)
CREATE OR REPLACE VIEW v_recent_risk_activities AS
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
    status,
    user_id,
    tags
FROM risk_activity_log
WHERE timestamp >= date_sub(current_timestamp(), 7) -- Last 7 days
ORDER BY timestamp DESC
LIMIT 200;

-- View for latest dashboard summary (matches API response format)
CREATE OR REPLACE VIEW v_latest_dashboard_summary AS
SELECT 
    total_exposure,
    total_var_95,
    total_var_99,
    active_alerts,
    critical_alerts,
    portfolio_count,
    hedge_effectiveness_avg,
    last_updated
FROM risk_dashboard_summary
WHERE calculation_date = (SELECT MAX(calculation_date) FROM risk_dashboard_summary);

-- ==================================================================
-- Sample data insertion for testing
-- ==================================================================

-- Insert sample positions
INSERT INTO positions VALUES
('pos_001', '2024-01-15', 'WTI_CRUDE', 10000.0, 'Energy_Portfolio', 'Goldman_Sachs', 'Houston', 'Trading_Book_1', 'USD', 754500.0, 25000.0, current_timestamp(), current_timestamp(), 'pipeline'),
('pos_002', '2024-01-15', 'NATURAL_GAS', 50000.0, 'Gas_Portfolio', 'JPMorgan', 'New_York', 'Gas_Book_1', 'USD', 142500.0, -8000.0, current_timestamp(), current_timestamp(), 'pipeline'),
('pos_003', '2024-01-15', 'BRENT_CRUDE', 8000.0, 'Oil_Portfolio', 'Shell_Trading', 'London', 'Oil_Book_1', 'USD', 625600.0, 15000.0, current_timestamp(), current_timestamp(), 'pipeline');

-- Insert sample VaR results
INSERT INTO var_results VALUES
('var_001', '2024-01-15', 'WTI_CRUDE', 4750000.0, 6200000.0, 'Energy_Portfolio', 7100000.0, 0.95, 'historical', 1, current_timestamp(), current_timestamp(), 'risk_engine'),
('var_002', '2024-01-15', 'NATURAL_GAS', 2100000.0, 2850000.0, 'Gas_Portfolio', 3200000.0, 0.95, 'monte_carlo', 1, current_timestamp(), current_timestamp(), 'risk_engine'),
('var_003', '2024-01-15', 'BRENT_CRUDE', 3200000.0, 4100000.0, 'Oil_Portfolio', 4800000.0, 0.95, 'parametric', 1, current_timestamp(), current_timestamp(), 'risk_engine');

-- Insert sample exposure limits
INSERT INTO exposure_limits VALUES
('limit_001', 'WTI_CRUDE', 'Energy_Portfolio', 'market', 15500000.0, 20000000.0, 77.5, 'warning', '2024-01-15T12:00:00Z', 'USD', null, 'Houston', 90.0, 80.0, current_timestamp(), current_timestamp(), 'risk_monitor'),
('limit_002', 'NATURAL_GAS', 'Gas_Portfolio', 'market', 8200000.0, 12000000.0, 68.3, 'ok', '2024-01-15T12:00:00Z', 'USD', null, 'New_York', 90.0, 80.0, current_timestamp(), current_timestamp(), 'risk_monitor'),
('limit_003', 'BRENT_CRUDE', 'Oil_Portfolio', 'credit', 22800000.0, 25000000.0, 91.2, 'breach', '2024-01-15T12:00:00Z', 'USD', 'Shell_Trading', 'London', 90.0, 80.0, current_timestamp(), current_timestamp(), 'risk_monitor');

-- Insert sample risk alerts
INSERT INTO risk_alerts VALUES
('alert_001', '2024-01-15T11:30:00Z', 'critical', 'limit_breach', 'BRENT_CRUDE', 'Credit exposure limit breached for Oil Portfolio', 22800000.0, 25000000.0, 'active', 'Oil_Portfolio', 'Shell_Trading', 'London', 8.8, 1, 'risk_manager_001', null, null, current_timestamp(), current_timestamp(), 'alert_system'),
('alert_002', '2024-01-15T10:15:00Z', 'high', 'var_threshold', 'WTI_CRUDE', 'VaR 95% approaching threshold', 4750000.0, 5000000.0, 'acknowledged', 'Energy_Portfolio', null, 'Houston', 5.0, 1, 'risk_analyst_002', null, null, current_timestamp(), current_timestamp(), 'alert_system');

-- Insert sample risk activities
INSERT INTO risk_activity_log VALUES
('act_001', '2024-01-15T11:30:00Z', 'limit_breach', 'alert', 'critical', 'BRENT_CRUDE', 'Oil_Portfolio', 'Credit exposure limit breached', 'credit_exposure', 22800000.0, 25000000.0, 'active', 'risk_manager_001', array('credit_risk', 'urgent'), 'Shell_Trading', 'London', 'Oil_Book_1', 8.8, null, null, null, null, null, current_timestamp(), current_timestamp(), 'risk_monitor'),
('act_002', '2024-01-15T10:15:00Z', 'scenario_analysis', 'analysis', 'medium', 'WTI_CRUDE', 'Energy_Portfolio', 'Completed stress test scenario: Oil price shock +25%', null, null, null, 'resolved', 'analyst_002', array('stress_test', 'scenario'), null, 'Houston', 'Trading_Book_1', null, 'Oil_Price_Shock_25pct', '{"price_change": "25%", "volatility_multiplier": "1.5"}', 'Acceptable risk level within tolerance', 'analyst_002', '2024-01-15T11:00:00Z', current_timestamp(), current_timestamp(), 'risk_monitor');

-- Insert sample dashboard summary
INSERT INTO risk_dashboard_summary VALUES
('summary_001', '2024-01-15', 125500000.0, 8750000.0, 12200000.0, 7, 2, 12, 0.847, '2024-01-15T12:00:00Z', 150, 25, 0.65, 22800000.0, 'USD', current_timestamp(), 'dashboard_aggregator');

ANALYZE TABLE positions COMPUTE STATISTICS;
ANALYZE TABLE var_results COMPUTE STATISTICS;
ANALYZE TABLE exposure_limits COMPUTE STATISTICS;
ANALYZE TABLE risk_alerts COMPUTE STATISTICS;
ANALYZE TABLE scenario_analysis COMPUTE STATISTICS;
ANALYZE TABLE stress_test_results COMPUTE STATISTICS;
ANALYZE TABLE var_sensitivity COMPUTE STATISTICS;
ANALYZE TABLE hedge_effectiveness COMPUTE STATISTICS;
ANALYZE TABLE risk_activity_log COMPUTE STATISTICS;
ANALYZE TABLE risk_dashboard_summary COMPUTE STATISTICS;

-- ==================================================================
-- End of Risk Management Tables DDL
-- ==================================================================
