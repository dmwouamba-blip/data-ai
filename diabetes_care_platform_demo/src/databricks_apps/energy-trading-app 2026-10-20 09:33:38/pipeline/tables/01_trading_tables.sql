-- ==================================================================
-- Trading Tables for ETRM Data 360 Pipeline
-- Aligned with backend schemas and API expectations
-- ==================================================================

-- Set catalog and schema
USE CATALOG totalenergies;
USE SCHEMA energy_market_intelligence;

-- ==================================================================
-- 1. TRADES TABLE (matches backend Trade schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS trades (
    trade_id STRING NOT NULL,
    instrument STRING NOT NULL,
    counterparty STRING NOT NULL,
    side STRING NOT NULL, -- BUY/SELL
    quantity DOUBLE NOT NULL,
    price DOUBLE NOT NULL,
    currency STRING NOT NULL DEFAULT 'USD',
    trade_date STRING NOT NULL, -- ISO date format
    settle_date STRING,
    timestamp STRING, -- ISO datetime format
    
    -- Additional fields for pipeline processing
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'pipeline',
    data_quality_score DOUBLE DEFAULT 1.0
)
USING DELTA
PARTITIONED BY (DATE(timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 2. TRADING ACTIVITY LOG (matches backend API expectations)
-- ==================================================================

CREATE TABLE IF NOT EXISTS trading_activity_log (
    -- Core identifiers
    activity_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    activity_type STRING NOT NULL, -- 'order_execution', 'risk_alert', 'hedging_operation', 'algorithmic_trade'
    trader_id STRING,
    
    -- Trading details
    instrument STRING NOT NULL,
    action STRING NOT NULL, -- 'BUY', 'SELL', 'HEDGE_REBALANCE', 'RISK_LIMIT_BREACH'
    quantity DOUBLE,
    price DOUBLE,
    status STRING NOT NULL, -- 'pending', 'executed', 'cancelled', 'failed'
    compliance_check BOOLEAN NOT NULL DEFAULT false,
    risk_score DOUBLE,
    
    -- Additional context
    category STRING, -- 'trading', 'risk_management', 'compliance'
    severity STRING, -- 'low', 'medium', 'high', 'critical'
    description STRING,
    notes STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'pipeline'
)
USING DELTA
PARTITIONED BY (DATE(timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 3. PRICE FORECAST DATA (supports price-forecast API)
-- ==================================================================

CREATE TABLE IF NOT EXISTS price_forecasts (
    forecast_id STRING NOT NULL,
    instrument STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    predicted_price DOUBLE NOT NULL,
    confidence_upper DOUBLE NOT NULL,
    confidence_lower DOUBLE NOT NULL,
    is_historical BOOLEAN NOT NULL,
    
    -- Model metadata
    model_name STRING,
    model_version STRING,
    model_accuracy DOUBLE,
    confidence_level DOUBLE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    forecast_horizon_hours INT,
    data_source STRING DEFAULT 'ml_pipeline'
)
USING DELTA
PARTITIONED BY (instrument, DATE(timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 4. MARKET PATTERNS (supports market-patterns API)
-- ==================================================================

CREATE TABLE IF NOT EXISTS market_patterns (
    pattern_id STRING NOT NULL,
    pattern_type STRING NOT NULL, -- 'Head and Shoulders', 'Ascending Triangle', etc.
    instrument STRING NOT NULL,
    confidence_score DOUBLE NOT NULL,
    expected_direction STRING NOT NULL, -- 'UP', 'DOWN', 'SIDEWAYS'
    time_horizon STRING NOT NULL,
    risk_level STRING NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
    
    -- Detection details
    detection_timestamp STRING NOT NULL, -- ISO datetime format
    pattern_start_time STRING,
    pattern_end_time STRING,
    key_levels ARRAY<DOUBLE>, -- Support/resistance levels
    
    -- Status tracking
    status STRING DEFAULT 'active', -- 'active', 'triggered', 'expired'
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'pattern_detection'
)
USING DELTA
PARTITIONED BY (instrument, DATE(detection_timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 5. MARKET ANOMALIES (supports market-patterns API)
-- ==================================================================

CREATE TABLE IF NOT EXISTS market_anomalies (
    anomaly_id STRING NOT NULL,
    anomaly_type STRING NOT NULL, -- 'Volume Spike', 'Price Jump', 'Liquidity Drop'
    instrument STRING NOT NULL,
    deviation_score DOUBLE NOT NULL,
    requires_attention BOOLEAN NOT NULL,
    
    -- Detection details
    detection_timestamp STRING NOT NULL, -- ISO datetime format
    anomaly_value DOUBLE,
    expected_value DOUBLE,
    threshold_value DOUBLE,
    
    -- Context
    market_conditions MAP<STRING, DOUBLE>,
    description STRING,
    
    -- Status tracking
    status STRING DEFAULT 'active', -- 'active', 'investigated', 'resolved'
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'anomaly_detection'
)
USING DELTA
PARTITIONED BY (instrument, DATE(detection_timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 6. MARKET MICROSTRUCTURE (supports market-microstructure API)
-- ==================================================================

CREATE TABLE IF NOT EXISTS market_microstructure (
    instrument STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    
    -- Bid/Ask data
    bid_price DOUBLE,
    ask_price DOUBLE,
    bid_volume DOUBLE,
    ask_volume DOUBLE,
    spread DOUBLE,
    mid_price DOUBLE,
    
    -- Order book depth (top 10 levels stored as JSON)
    bids STRING, -- JSON array of {price, volume, orders}
    asks STRING, -- JSON array of {price, volume, orders}
    
    -- Liquidity metrics
    market_depth DOUBLE,
    liquidity_score DOUBLE,
    bid_ask_spread DOUBLE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'market_data_feed'
)
USING DELTA
PARTITIONED BY (instrument, DATE(timestamp))
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- Create indexes for better query performance
-- ==================================================================

CREATE INDEX IF NOT EXISTS idx_trades_timestamp ON trades (timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_instrument ON trades (instrument);
CREATE INDEX IF NOT EXISTS idx_trading_activity_timestamp ON trading_activity_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_trading_activity_instrument ON trading_activity_log (instrument);
CREATE INDEX IF NOT EXISTS idx_price_forecasts_instrument_timestamp ON price_forecasts (instrument, timestamp);
CREATE INDEX IF NOT EXISTS idx_market_patterns_instrument ON market_patterns (instrument);
CREATE INDEX IF NOT EXISTS idx_market_anomalies_instrument ON market_anomalies (instrument);
CREATE INDEX IF NOT EXISTS idx_market_microstructure_instrument_timestamp ON market_microstructure (instrument, timestamp);

-- ==================================================================
-- Create views for API consumption
-- ==================================================================

-- View for recent trading activities (matches API response format)
CREATE OR REPLACE VIEW v_recent_trading_activities AS
SELECT 
    activity_id,
    timestamp,
    activity_type,
    trader_id,
    instrument,
    action,
    quantity,
    price,
    status,
    compliance_check,
    risk_score
FROM trading_activity_log
WHERE timestamp >= date_sub(current_timestamp(), 1) -- Last 24 hours
ORDER BY timestamp DESC
LIMIT 100;

-- View for active market patterns (matches API response format)
CREATE OR REPLACE VIEW v_active_market_patterns AS
SELECT 
    pattern_id,
    pattern_type,
    instrument,
    confidence_score,
    expected_direction,
    time_horizon,
    risk_level,
    detection_timestamp
FROM market_patterns
WHERE status = 'active'
    AND detection_timestamp >= date_sub(current_timestamp(), 7) -- Last 7 days
ORDER BY confidence_score DESC;

-- View for recent market anomalies (matches API response format)
CREATE OR REPLACE VIEW v_recent_market_anomalies AS
SELECT 
    anomaly_id,
    anomaly_type,
    instrument,
    deviation_score,
    requires_attention,
    detection_timestamp
FROM market_anomalies
WHERE status = 'active'
    AND detection_timestamp >= date_sub(current_timestamp(), 1) -- Last 24 hours
ORDER BY deviation_score DESC;

-- ==================================================================
-- Sample data insertion for testing
-- ==================================================================

-- Insert sample trades
INSERT INTO trades VALUES
('trade_001', 'WTI_CRUDE', 'Goldman_Sachs', 'BUY', 1000.0, 75.45, 'USD', '2024-01-15', '2024-01-17', '2024-01-15T09:30:00Z', current_timestamp(), current_timestamp(), 'pipeline', 1.0),
('trade_002', 'NATURAL_GAS', 'JPMorgan', 'SELL', 5000.0, 2.85, 'USD', '2024-01-15', '2024-01-16', '2024-01-15T10:15:00Z', current_timestamp(), current_timestamp(), 'pipeline', 1.0),
('trade_003', 'BRENT_CRUDE', 'Shell_Trading', 'BUY', 2000.0, 78.20, 'USD', '2024-01-15', '2024-01-18', '2024-01-15T11:45:00Z', current_timestamp(), current_timestamp(), 'pipeline', 1.0);

-- Insert sample trading activities
INSERT INTO trading_activity_log VALUES
('trd_001', '2024-01-15T09:30:00Z', 'order_execution', 'trader.sarah', 'WTI_CRUDE', 'BUY', 1000.0, 75.45, 'executed', true, 0.3, 'trading', 'low', 'Successful execution of WTI crude buy order', 'Standard market order', current_timestamp(), current_timestamp(), 'pipeline'),
('trd_002', '2024-01-15T10:15:00Z', 'risk_alert', 'risk.manager', 'NATURAL_GAS', 'RISK_LIMIT_BREACH', null, null, 'pending', false, 0.85, 'risk_management', 'high', 'Natural gas position approaching risk limit', 'Requires immediate attention', current_timestamp(), current_timestamp(), 'pipeline');

-- Insert sample price forecasts
INSERT INTO price_forecasts VALUES
('forecast_001', 'WTI_CRUDE', '2024-01-15T12:00:00Z', 76.20, 78.50, 73.90, false, 'LSTM_v2', '2.1', 87.3, 0.85, current_timestamp(), 24, 'ml_pipeline'),
('forecast_002', 'NATURAL_GAS', '2024-01-15T12:00:00Z', 2.95, 3.15, 2.75, false, 'LSTM_v2', '2.1', 82.1, 0.78, current_timestamp(), 24, 'ml_pipeline');

-- Insert sample market patterns
INSERT INTO market_patterns VALUES
('pat_001', 'Head and Shoulders', 'WTI_CRUDE', 0.89, 'DOWN', '2-4 hours', 'HIGH', '2024-01-15T11:30:00Z', '2024-01-15T08:00:00Z', null, array(75.0, 76.5, 74.2), 'active', current_timestamp(), 'pattern_detection'),
('pat_002', 'Ascending Triangle', 'NATURAL_GAS', 0.76, 'UP', '4-8 hours', 'MEDIUM', '2024-01-15T11:45:00Z', '2024-01-15T09:00:00Z', null, array(2.80, 2.90, 2.85), 'active', current_timestamp(), 'pattern_detection');

-- Insert sample market anomalies
INSERT INTO market_anomalies VALUES
('ano_001', 'Volume Spike', 'RBOB_GASOLINE', 4.2, true, '2024-01-15T11:20:00Z', 15000.0, 3500.0, 5000.0, map('volatility', 0.25, 'liquidity', 0.8), 'Unusual volume spike detected in RBOB gasoline', 'active', current_timestamp(), 'anomaly_detection');

ANALYZE TABLE trades COMPUTE STATISTICS;
ANALYZE TABLE trading_activity_log COMPUTE STATISTICS;
ANALYZE TABLE price_forecasts COMPUTE STATISTICS;
ANALYZE TABLE market_patterns COMPUTE STATISTICS;
ANALYZE TABLE market_anomalies COMPUTE STATISTICS;
ANALYZE TABLE market_microstructure COMPUTE STATISTICS;

-- ==================================================================
-- End of Trading Tables DDL
-- ==================================================================
