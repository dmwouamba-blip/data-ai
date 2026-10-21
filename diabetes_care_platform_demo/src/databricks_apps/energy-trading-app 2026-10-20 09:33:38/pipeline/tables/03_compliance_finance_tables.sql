-- ==================================================================
-- Compliance and Finance Tables for ETRM Data 360 Pipeline
-- Aligned with backend schemas and API expectations
-- ==================================================================

-- Set catalog and schema
USE CATALOG totalenergies;
USE SCHEMA energy_market_intelligence;

-- ==================================================================
-- 1. COMPLIANCE EVENTS TABLE (matches backend ComplianceEvent schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS compliance_events (
    event_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    severity STRING NOT NULL, -- 'low', 'medium', 'high'
    category STRING NOT NULL, -- 'policy', 'kyc', 'trade_surveillance', 'regulatory'
    message STRING NOT NULL,
    status STRING NOT NULL, -- 'open', 'investigating', 'closed'
    
    -- Additional compliance context
    product STRING,
    portfolio STRING,
    counterparty STRING,
    trader_id STRING,
    trade_id STRING,
    regulation_type STRING, -- 'MiFID', 'EMIR', 'Dodd-Frank', 'MAR'
    violation_type STRING, -- 'limit_breach', 'reporting_delay', 'unauthorized_trade'
    
    -- Resolution tracking
    assigned_to STRING,
    investigation_notes STRING,
    resolution_notes STRING,
    resolved_by STRING,
    resolved_at STRING, -- ISO datetime format
    
    -- Regulatory reporting
    requires_regulatory_reporting BOOLEAN DEFAULT false,
    reported_to_regulator BOOLEAN DEFAULT false,
    reporting_deadline STRING, -- ISO datetime format
    report_reference STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'compliance_monitor'
)
USING DELTA
PARTITIONED BY (DATE(timestamp), severity)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 2. PNL TABLE (matches backend PnL schema)
-- ==================================================================

CREATE TABLE IF NOT EXISTS pnl (
    pnl_id STRING NOT NULL,
    date STRING NOT NULL, -- ISO date format
    product STRING NOT NULL,
    pnl DOUBLE NOT NULL,
    
    -- Additional P&L breakdown
    portfolio STRING,
    trader_id STRING,
    book STRING,
    currency STRING DEFAULT 'USD',
    
    -- P&L components
    realized_pnl DOUBLE,
    unrealized_pnl DOUBLE,
    mark_to_market_pnl DOUBLE,
    carry_pnl DOUBLE,
    theta_pnl DOUBLE,
    
    -- Attribution
    price_pnl DOUBLE,
    volume_pnl DOUBLE,
    basis_pnl DOUBLE,
    fx_pnl DOUBLE,
    
    -- Additional metrics
    gross_pnl DOUBLE,
    net_pnl DOUBLE,
    trading_fees DOUBLE,
    commission DOUBLE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'pnl_engine'
)
USING DELTA
PARTITIONED BY (DATE(date), product)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- 3. REGULATORY REPORTS TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS regulatory_reports (
    report_id STRING NOT NULL,
    report_type STRING NOT NULL, -- 'EMIR', 'MiFID', 'Dodd-Frank', 'MAR'
    report_date STRING NOT NULL, -- ISO date format
    submission_date STRING, -- ISO datetime format
    status STRING NOT NULL, -- 'draft', 'submitted', 'accepted', 'rejected'
    
    -- Report content
    trade_ids ARRAY<STRING>,
    position_ids ARRAY<STRING>,
    report_data STRING, -- JSON string containing report data
    
    -- Regulatory details
    regulator STRING, -- 'ESMA', 'CFTC', 'FCA', 'BaFin'
    jurisdiction STRING,
    reporting_obligation STRING,
    
    -- Submission tracking
    submission_reference STRING,
    acknowledgment_reference STRING,
    rejection_reason STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'regulatory_reporting'
)
USING DELTA
PARTITIONED BY (DATE(report_date), report_type)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 4. TRADE SURVEILLANCE TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS trade_surveillance (
    surveillance_id STRING NOT NULL,
    trade_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    surveillance_type STRING NOT NULL, -- 'market_abuse', 'position_limit', 'best_execution'
    
    -- Detection details
    alert_type STRING NOT NULL, -- 'front_running', 'wash_trading', 'spoofing', 'layering'
    confidence_score DOUBLE NOT NULL,
    severity STRING NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- Trade context
    instrument STRING,
    trader_id STRING,
    counterparty STRING,
    trade_price DOUBLE,
    market_price DOUBLE,
    price_deviation_pct DOUBLE,
    
    -- Market context
    market_conditions STRING, -- JSON string
    volume_profile STRING, -- JSON string
    
    -- Investigation
    status STRING DEFAULT 'detected', -- 'detected', 'investigating', 'cleared', 'escalated'
    investigated_by STRING,
    investigation_notes STRING,
    cleared_reason STRING,
    escalated_to STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'surveillance_engine'
)
USING DELTA
PARTITIONED BY (DATE(timestamp), surveillance_type)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 5. KYC (Know Your Customer) TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS kyc_records (
    kyc_id STRING NOT NULL,
    counterparty_id STRING NOT NULL,
    counterparty_name STRING NOT NULL,
    kyc_status STRING NOT NULL, -- 'pending', 'approved', 'rejected', 'expired'
    
    -- KYC details
    entity_type STRING, -- 'individual', 'corporate', 'fund', 'government'
    jurisdiction STRING,
    risk_rating STRING, -- 'low', 'medium', 'high'
    
    -- Documentation
    documents_received ARRAY<STRING>,
    documents_verified BOOLEAN DEFAULT false,
    verification_date STRING, -- ISO date format
    verified_by STRING,
    
    -- Due diligence
    enhanced_due_diligence BOOLEAN DEFAULT false,
    pep_check BOOLEAN DEFAULT false, -- Politically Exposed Person
    sanctions_check BOOLEAN DEFAULT false,
    adverse_media_check BOOLEAN DEFAULT false,
    
    -- Review dates
    last_review_date STRING, -- ISO date format
    next_review_date STRING, -- ISO date format
    review_frequency_months INT DEFAULT 12,
    
    -- Approval
    approved_by STRING,
    approval_date STRING, -- ISO date format
    approval_notes STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    updated_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'kyc_system'
)
USING DELTA
PARTITIONED BY (kyc_status, risk_rating)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true'
);

-- ==================================================================
-- 6. AUDIT TRAIL TABLE
-- ==================================================================

CREATE TABLE IF NOT EXISTS audit_trail (
    audit_id STRING NOT NULL,
    timestamp STRING NOT NULL, -- ISO datetime format
    user_id STRING NOT NULL,
    action STRING NOT NULL, -- 'create', 'update', 'delete', 'view', 'approve'
    entity_type STRING NOT NULL, -- 'trade', 'position', 'limit', 'alert'
    entity_id STRING NOT NULL,
    
    -- Change details
    old_values STRING, -- JSON string
    new_values STRING, -- JSON string
    field_changes ARRAY<STRING>,
    
    -- Context
    ip_address STRING,
    user_agent STRING,
    session_id STRING,
    reason STRING,
    
    -- System context
    system_name STRING,
    application_version STRING,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT current_timestamp(),
    data_source STRING DEFAULT 'audit_system'
)
USING DELTA
PARTITIONED BY (DATE(timestamp), entity_type)
TBLPROPERTIES (
    'delta.autoOptimize.optimizeWrite' = 'true',
    'delta.autoOptimize.autoCompact' = 'true',
    'delta.enableChangeDataFeed' = 'true'
);

-- ==================================================================
-- Create indexes for better query performance
-- ==================================================================

CREATE INDEX IF NOT EXISTS idx_compliance_events_timestamp_severity ON compliance_events (timestamp, severity);
CREATE INDEX IF NOT EXISTS idx_compliance_events_category_status ON compliance_events (category, status);
CREATE INDEX IF NOT EXISTS idx_pnl_date_product ON pnl (date, product);
CREATE INDEX IF NOT EXISTS idx_pnl_portfolio_trader ON pnl (portfolio, trader_id);
CREATE INDEX IF NOT EXISTS idx_regulatory_reports_date_type ON regulatory_reports (report_date, report_type);
CREATE INDEX IF NOT EXISTS idx_trade_surveillance_timestamp_type ON trade_surveillance (timestamp, surveillance_type);
CREATE INDEX IF NOT EXISTS idx_kyc_records_counterparty_status ON kyc_records (counterparty_id, kyc_status);
CREATE INDEX IF NOT EXISTS idx_audit_trail_timestamp_entity ON audit_trail (timestamp, entity_type);

-- ==================================================================
-- Create views for API consumption
-- ==================================================================

-- View for active compliance events (matches API response format)
CREATE OR REPLACE VIEW v_active_compliance_events AS
SELECT 
    event_id,
    timestamp,
    severity,
    category,
    message,
    status,
    product,
    counterparty,
    trader_id
FROM compliance_events
WHERE status IN ('open', 'investigating')
ORDER BY severity DESC, timestamp DESC;

-- View for recent P&L (matches API response format)
CREATE OR REPLACE VIEW v_recent_pnl AS
SELECT 
    date,
    product,
    pnl,
    portfolio,
    trader_id,
    realized_pnl,
    unrealized_pnl
FROM pnl
WHERE date >= date_sub(current_date(), 30) -- Last 30 days
ORDER BY date DESC, product;

-- View for P&L summary by product
CREATE OR REPLACE VIEW v_pnl_summary_by_product AS
SELECT 
    product,
    SUM(pnl) as total_pnl,
    SUM(realized_pnl) as total_realized_pnl,
    SUM(unrealized_pnl) as total_unrealized_pnl,
    COUNT(*) as record_count,
    MAX(date) as latest_date
FROM pnl
WHERE date >= date_sub(current_date(), 30) -- Last 30 days
GROUP BY product
ORDER BY total_pnl DESC;

-- View for P&L summary by trader
CREATE OR REPLACE VIEW v_pnl_summary_by_trader AS
SELECT 
    trader_id,
    portfolio,
    SUM(pnl) as total_pnl,
    SUM(realized_pnl) as total_realized_pnl,
    SUM(unrealized_pnl) as total_unrealized_pnl,
    COUNT(DISTINCT product) as products_traded,
    MAX(date) as latest_trade_date
FROM pnl
WHERE date >= date_sub(current_date(), 30) -- Last 30 days
    AND trader_id IS NOT NULL
GROUP BY trader_id, portfolio
ORDER BY total_pnl DESC;

-- View for compliance dashboard
CREATE OR REPLACE VIEW v_compliance_dashboard AS
SELECT 
    COUNT(*) as total_events,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_events,
    COUNT(CASE WHEN status = 'investigating' THEN 1 END) as investigating_events,
    COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_events,
    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events,
    COUNT(CASE WHEN requires_regulatory_reporting = true AND reported_to_regulator = false THEN 1 END) as pending_regulatory_reports
FROM compliance_events
WHERE timestamp >= date_sub(current_timestamp(), 30); -- Last 30 days

-- View for trade surveillance alerts
CREATE OR REPLACE VIEW v_surveillance_alerts AS
SELECT 
    surveillance_id,
    trade_id,
    timestamp,
    surveillance_type,
    alert_type,
    confidence_score,
    severity,
    instrument,
    trader_id,
    status
FROM trade_surveillance
WHERE status IN ('detected', 'investigating')
    AND timestamp >= date_sub(current_timestamp(), 7) -- Last 7 days
ORDER BY confidence_score DESC, timestamp DESC;

-- ==================================================================
-- Sample data insertion for testing
-- ==================================================================

-- Insert sample compliance events
INSERT INTO compliance_events VALUES
('comp_001', '2024-01-15T09:30:00Z', 'high', 'trade_surveillance', 'Potential front-running detected in WTI Crude trades', 'investigating', 'WTI_CRUDE', 'Energy_Portfolio', 'Goldman_Sachs', 'trader_001', 'trade_001', 'MiFID', 'front_running', 'compliance_officer_001', 'Investigating unusual trading pattern before market announcement', null, null, null, false, false, null, null, current_timestamp(), current_timestamp(), 'compliance_monitor'),
('comp_002', '2024-01-15T11:15:00Z', 'medium', 'kyc', 'KYC documentation expired for counterparty Shell Trading', 'open', null, null, 'Shell_Trading', null, null, 'KYC', 'documentation_expired', null, null, null, null, null, true, false, '2024-01-20T23:59:59Z', null, current_timestamp(), current_timestamp(), 'compliance_monitor');

-- Insert sample P&L data
INSERT INTO pnl VALUES
('pnl_001', '2024-01-15', 'WTI_CRUDE', 125000.0, 'Energy_Portfolio', 'trader_001', 'Trading_Book_1', 'USD', 100000.0, 25000.0, 125000.0, 5000.0, -2000.0, 80000.0, 30000.0, 10000.0, 5000.0, 150000.0, 125000.0, 15000.0, 10000.0, current_timestamp(), current_timestamp(), 'pnl_engine'),
('pnl_002', '2024-01-15', 'NATURAL_GAS', -35000.0, 'Gas_Portfolio', 'trader_002', 'Gas_Book_1', 'USD', -20000.0, -15000.0, -35000.0, -5000.0, 1000.0, -25000.0, -8000.0, -2000.0, 0.0, -30000.0, -35000.0, 3000.0, 2000.0, current_timestamp(), current_timestamp(), 'pnl_engine'),
('pnl_003', '2024-01-15', 'BRENT_CRUDE', 85000.0, 'Oil_Portfolio', 'trader_003', 'Oil_Book_1', 'USD', 70000.0, 15000.0, 85000.0, 3000.0, -1000.0, 60000.0, 20000.0, 5000.0, 0.0, 90000.0, 85000.0, 8000.0, 3000.0, current_timestamp(), current_timestamp(), 'pnl_engine');

-- Insert sample trade surveillance
INSERT INTO trade_surveillance VALUES
('surv_001', 'trade_001', '2024-01-15T09:25:00Z', 'market_abuse', 'front_running', 0.85, 'high', 'WTI_CRUDE', 'trader_001', 'Goldman_Sachs', 75.45, 75.50, -0.07, '{"volatility": 0.25, "volume": "high"}', '{"avg_volume": 5000, "current_volume": 15000}', 'investigating', 'surveillance_analyst_001', 'Unusual trading activity 5 minutes before market announcement', null, null, current_timestamp(), current_timestamp(), 'surveillance_engine');

-- Insert sample KYC records
INSERT INTO kyc_records VALUES
('kyc_001', 'counterparty_001', 'Goldman Sachs Commodities', 'approved', 'corporate', 'US', 'medium', array('corporate_registration', 'financial_statements', 'board_resolution'), true, '2024-01-10', 'kyc_officer_001', false, false, true, false, '2024-01-10', '2025-01-10', 12, 'kyc_manager_001', '2024-01-10', 'Standard corporate KYC approved', current_timestamp(), current_timestamp(), 'kyc_system'),
('kyc_002', 'counterparty_002', 'Shell Trading International', 'pending', 'corporate', 'UK', 'low', array('corporate_registration', 'financial_statements'), false, null, null, false, false, true, false, null, null, 12, null, null, null, current_timestamp(), current_timestamp(), 'kyc_system');

-- Insert sample audit trail
INSERT INTO audit_trail VALUES
('audit_001', '2024-01-15T09:30:00Z', 'trader_001', 'create', 'trade', 'trade_001', null, '{"instrument": "WTI_CRUDE", "quantity": 1000, "price": 75.45, "side": "BUY"}', array('instrument', 'quantity', 'price', 'side'), '192.168.1.100', 'Mozilla/5.0...', 'session_001', 'New trade execution', 'ETRM_360', '1.0', current_timestamp(), 'audit_system'),
('audit_002', '2024-01-15T11:15:00Z', 'risk_manager_001', 'update', 'alert', 'alert_001', '{"status": "active"}', '{"status": "acknowledged"}', array('status'), '192.168.1.101', 'Mozilla/5.0...', 'session_002', 'Risk alert acknowledged', 'ETRM_360', '1.0', current_timestamp(), 'audit_system');

ANALYZE TABLE compliance_events COMPUTE STATISTICS;
ANALYZE TABLE pnl COMPUTE STATISTICS;
ANALYZE TABLE regulatory_reports COMPUTE STATISTICS;
ANALYZE TABLE trade_surveillance COMPUTE STATISTICS;
ANALYZE TABLE kyc_records COMPUTE STATISTICS;
ANALYZE TABLE audit_trail COMPUTE STATISTICS;

-- ==================================================================
-- End of Compliance and Finance Tables DDL
-- ==================================================================
