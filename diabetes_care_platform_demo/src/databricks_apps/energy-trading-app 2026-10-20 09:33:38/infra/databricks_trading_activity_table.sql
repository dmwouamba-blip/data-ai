-- ==================================================================
-- Trading Activity Table DDL for Databricks
-- This table tracks all trading activities and AI-driven insights
-- ==================================================================

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS etrm_trading_analytics;

USE etrm_trading_analytics;

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS trading_activity_log;

-- Create the main trading activity table
CREATE TABLE trading_activity_log (
  -- Primary identifiers
  activity_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  
  -- Activity classification
  activity_type STRING NOT NULL, -- 'order_execution', 'risk_alert', 'hedging_operation', 'algorithmic_trade', etc.
  category STRING NOT NULL, -- 'trading', 'risk_management', 'compliance', 'analytics', etc.
  
  -- Trading details
  trader_id STRING,
  instrument STRING NOT NULL,
  action STRING NOT NULL, -- 'BUY', 'SELL', 'HEDGE_REBALANCE', 'RISK_LIMIT_BREACH', etc.
  quantity DECIMAL(18,4),
  price DECIMAL(18,6),
  value DECIMAL(18,2),
  currency STRING DEFAULT 'USD',
  
  -- Execution details
  status STRING NOT NULL, -- 'pending', 'executed', 'cancelled', 'failed'
  execution_time DECIMAL(8,3), -- seconds
  order_type STRING, -- 'Market Order', 'Limit Order', 'Stop Loss', etc.
  counterparty STRING,
  venue STRING, -- 'NYMEX', 'ICE', 'CME', etc.
  
  -- Strategy and AI insights
  strategy STRING, -- 'Momentum Trading', 'Statistical Arbitrage', 'Delta Neutral', etc.
  ai_confidence_score DECIMAL(4,3), -- AI confidence in trade/decision (0-1)
  pattern_detected STRING, -- Detected trading pattern
  market_sentiment DECIMAL(4,3), -- Market sentiment score (0-1)
  
  -- Risk metrics
  risk_score DECIMAL(4,3), -- Risk assessment score (0-1)
  var_impact DECIMAL(18,2), -- Impact on Value at Risk
  exposure_change DECIMAL(18,2), -- Change in position exposure
  hedge_effectiveness DECIMAL(4,3), -- Hedge effectiveness ratio
  
  -- Compliance and monitoring
  compliance_check BOOLEAN NOT NULL DEFAULT false,
  compliance_notes STRING,
  requires_approval BOOLEAN DEFAULT false,
  approved_by STRING,
  approval_timestamp TIMESTAMP,
  
  -- AI-driven insights
  predicted_price_direction STRING, -- 'UP', 'DOWN', 'SIDEWAYS'
  price_forecast DECIMAL(18,6), -- AI price forecast
  forecast_confidence DECIMAL(4,3), -- Forecast confidence (0-1)
  anomaly_detected BOOLEAN DEFAULT false,
  anomaly_description STRING,
  
  -- Performance tracking
  actual_pnl DECIMAL(18,2), -- Actual P&L after position closure
  expected_pnl DECIMAL(18,2), -- Expected P&L at trade initiation
  benchmark_performance DECIMAL(18,2), -- Performance vs benchmark
  attribution_factors MAP<STRING, DECIMAL(10,6)>, -- Performance attribution
  
  -- Metadata and tracking
  notes STRING,
  tags ARRAY<STRING>, -- Array of tags for categorization
  source_system STRING DEFAULT 'ETRM_360', -- Source system
  data_version STRING DEFAULT '1.0',
  session_id STRING, -- Trading session identifier
  parent_activity_id STRING, -- For related activities (e.g., hedge for a position)
  
  -- Market context
  market_conditions MAP<STRING, DECIMAL(10,6)>, -- Market conditions at time of activity
  volatility_index DECIMAL(8,4), -- Market volatility index
  liquidity_score DECIMAL(4,3), -- Market liquidity score
  spread_cost DECIMAL(18,6), -- Bid-ask spread cost
  
  -- Data lineage
  created_by STRING DEFAULT 'system',
  updated_at TIMESTAMP,
  updated_by STRING,
  data_quality_score DECIMAL(4,3) DEFAULT 1.0
)
USING DELTA
PARTITIONED BY (DATE(timestamp))
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true',
  'delta.enableChangeDataFeed' = 'true',
  'description' = 'Trading activity log with AI insights and risk metrics',
  'data_classification' = 'confidential',
  'retention_days' = '2555', -- 7 years retention
  'owner' = 'trading_team'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_activity_timestamp ON trading_activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_activity_instrument ON trading_activity_log (instrument);
CREATE INDEX IF NOT EXISTS idx_trading_activity_trader ON trading_activity_log (trader_id);
CREATE INDEX IF NOT EXISTS idx_trading_activity_type ON trading_activity_log (activity_type);
CREATE INDEX IF NOT EXISTS idx_trading_activity_status ON trading_activity_log (status);

-- ==================================================================
-- Create supplementary tables for enhanced analytics
-- ==================================================================

-- AI Model Performance Tracking Table
CREATE TABLE IF NOT EXISTS ai_model_performance (
  model_id STRING NOT NULL,
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  instrument STRING NOT NULL,
  prediction_type STRING NOT NULL, -- 'price', 'direction', 'volatility', 'risk'
  predicted_value DECIMAL(18,6),
  actual_value DECIMAL(18,6),
  prediction_accuracy DECIMAL(4,3),
  model_confidence DECIMAL(4,3),
  feature_importance MAP<STRING, DECIMAL(4,3)>,
  training_data_window STRING,
  created_at TIMESTAMP DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(timestamp));

-- Market Microstructure Data Table
CREATE TABLE IF NOT EXISTS market_microstructure (
  timestamp TIMESTAMP NOT NULL,
  instrument STRING NOT NULL,
  bid_price DECIMAL(18,6),
  ask_price DECIMAL(18,6),
  bid_size DECIMAL(18,4),
  ask_size DECIMAL(18,4),
  spread DECIMAL(18,6),
  mid_price DECIMAL(18,6),
  last_price DECIMAL(18,6),
  volume DECIMAL(18,4),
  trade_count INT,
  liquidity_score DECIMAL(4,3),
  price_impact DECIMAL(8,6),
  order_flow_imbalance DECIMAL(4,3),
  volatility_index DECIMAL(8,4),
  created_at TIMESTAMP DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(timestamp), instrument);

-- Trading Signals and Patterns Table
CREATE TABLE IF NOT EXISTS trading_signals (
  signal_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  instrument STRING NOT NULL,
  signal_type STRING NOT NULL, -- 'pattern', 'anomaly', 'arbitrage', 'momentum'
  signal_strength DECIMAL(4,3),
  confidence_score DECIMAL(4,3),
  time_horizon STRING,
  expected_direction STRING,
  target_price DECIMAL(18,6),
  stop_loss DECIMAL(18,6),
  risk_level STRING,
  pattern_details MAP<STRING, STRING>,
  market_conditions MAP<STRING, DECIMAL(10,6)>,
  backtest_performance DECIMAL(4,3),
  signal_status STRING DEFAULT 'active', -- 'active', 'triggered', 'expired'
  created_at TIMESTAMP DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(timestamp));

-- ==================================================================
-- Create views for common analytics queries
-- ==================================================================

-- Daily trading summary view
CREATE OR REPLACE VIEW daily_trading_summary AS
SELECT 
  DATE(timestamp) as trade_date,
  instrument,
  COUNT(*) as total_trades,
  SUM(CASE WHEN action IN ('BUY', 'SELL') THEN quantity ELSE 0 END) as total_volume,
  SUM(CASE WHEN action IN ('BUY', 'SELL') THEN value ELSE 0 END) as total_value,
  AVG(risk_score) as avg_risk_score,
  SUM(CASE WHEN status = 'executed' THEN 1 ELSE 0 END) as successful_trades,
  SUM(CASE WHEN compliance_check = false THEN 1 ELSE 0 END) as compliance_issues,
  AVG(ai_confidence_score) as avg_ai_confidence,
  SUM(COALESCE(actual_pnl, 0)) as total_pnl
FROM trading_activity_log
WHERE activity_type IN ('order_execution', 'algorithmic_trade')
GROUP BY DATE(timestamp), instrument;

-- Real-time risk monitoring view
CREATE OR REPLACE VIEW real_time_risk_monitor AS
SELECT 
  instrument,
  SUM(CASE WHEN action = 'BUY' THEN quantity WHEN action = 'SELL' THEN -quantity ELSE 0 END) as net_position,
  SUM(exposure_change) as total_exposure,
  MAX(risk_score) as max_risk_score,
  COUNT(CASE WHEN anomaly_detected = true THEN 1 END) as anomaly_count,
  MAX(timestamp) as last_activity,
  AVG(market_sentiment) as avg_sentiment
FROM trading_activity_log
WHERE timestamp >= current_timestamp() - INTERVAL 24 HOURS
  AND status = 'executed'
GROUP BY instrument;

-- AI performance analytics view
CREATE OR REPLACE VIEW ai_performance_analytics AS
SELECT 
  DATE(timestamp) as analysis_date,
  instrument,
  COUNT(CASE WHEN ai_confidence_score > 0.7 THEN 1 END) as high_confidence_trades,
  AVG(ai_confidence_score) as avg_confidence,
  AVG(CASE WHEN actual_pnl IS NOT NULL THEN 
    CASE WHEN (predicted_price_direction = 'UP' AND actual_pnl > 0) OR 
              (predicted_price_direction = 'DOWN' AND actual_pnl > 0) 
         THEN 1.0 ELSE 0.0 END 
  END) as prediction_accuracy,
  SUM(CASE WHEN anomaly_detected = true THEN 1 ELSE 0 END) as anomalies_detected,
  AVG(forecast_confidence) as avg_forecast_confidence
FROM trading_activity_log
WHERE ai_confidence_score IS NOT NULL
GROUP BY DATE(timestamp), instrument;

-- ==================================================================
-- Data quality and monitoring
-- ==================================================================

-- Create data quality monitoring table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  check_timestamp TIMESTAMP NOT NULL,
  table_name STRING NOT NULL,
  metric_name STRING NOT NULL,
  metric_value DECIMAL(10,4),
  threshold_value DECIMAL(10,4),
  status STRING, -- 'PASS', 'WARN', 'FAIL'
  details STRING,
  created_at TIMESTAMP DEFAULT current_timestamp()
)
USING DELTA;

-- ==================================================================
-- Insert sample data for testing
-- ==================================================================

INSERT INTO trading_activity_log VALUES
(
  'trd_sample_001',
  current_timestamp(),
  current_timestamp(),
  'order_execution',
  'trading',
  'trader.sarah',
  'WTI Crude',
  'BUY',
  500.0000,
  75.450000,
  37725.00,
  'USD',
  'executed',
  1.200,
  'Market Order',
  'Goldman Sachs',
  'NYMEX',
  'Momentum Trading',
  0.850,
  'Ascending Triangle',
  0.650,
  0.300,
  2500.00,
  15000.00,
  0.920,
  true,
  'All compliance checks passed',
  false,
  null,
  null,
  'UP',
  76.200000,
  0.780,
  false,
  null,
  null,
  null,
  null,
  map(),
  'AI-driven momentum trade based on pattern recognition',
  array('energy', 'crude_oil', 'momentum', 'ai_driven'),
  'ETRM_360',
  '1.0',
  'session_2024_001',
  null,
  map('vix', 18.5, 'oil_volatility', 22.3),
  18.5000,
  0.850,
  0.025000,
  'system',
  current_timestamp(),
  'system',
  1.0
);

-- ==================================================================
-- Grant permissions (adjust as needed for your organization)
-- ==================================================================

-- Grant read access to analysts
-- GRANT SELECT ON trading_activity_log TO `trading_analysts`;
-- GRANT SELECT ON daily_trading_summary TO `trading_analysts`;
-- GRANT SELECT ON real_time_risk_monitor TO `trading_analysts`;

-- Grant write access to trading systems
-- GRANT INSERT, UPDATE ON trading_activity_log TO `trading_systems`;

ANALYZE TABLE trading_activity_log COMPUTE STATISTICS;

-- ==================================================================
-- End of DDL
-- ==================================================================
