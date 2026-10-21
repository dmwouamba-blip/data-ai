-- ==================================================================
-- Unified Views and Analytical Tables for ETRM Data 360 Pipeline
-- Dashboard consumption and cross-functional analytics
-- ==================================================================

-- Set catalog and schema
USE CATALOG totalenergies;
USE SCHEMA energy_market_intelligence;

-- ==================================================================
-- 1. UNIFIED DASHBOARD VIEWS
-- ==================================================================

-- Master dashboard view combining all key metrics
CREATE OR REPLACE VIEW v_master_dashboard AS
SELECT 
    current_timestamp() as last_updated,
    
    -- Trading metrics
    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = current_date()) as trades_today,
    (SELECT SUM(quantity * price) FROM trades WHERE DATE(timestamp) = current_date()) as trading_volume_today,
    (SELECT COUNT(DISTINCT instrument) FROM trades WHERE DATE(timestamp) = current_date()) as instruments_traded_today,
    
    -- Risk metrics
    (SELECT SUM(total_var_95) FROM risk_dashboard_summary WHERE calculation_date = (SELECT MAX(calculation_date) FROM risk_dashboard_summary)) as total_var_95,
    (SELECT COUNT(*) FROM risk_alerts WHERE status = 'active') as active_risk_alerts,
    (SELECT COUNT(*) FROM risk_alerts WHERE status = 'active' AND severity = 'critical') as critical_risk_alerts,
    
    -- P&L metrics
    (SELECT SUM(pnl) FROM pnl WHERE date = current_date()) as pnl_today,
    (SELECT SUM(pnl) FROM pnl WHERE date >= date_sub(current_date(), 7)) as pnl_week,
    (SELECT SUM(pnl) FROM pnl WHERE date >= date_sub(current_date(), 30)) as pnl_month,
    
    -- Compliance metrics
    (SELECT COUNT(*) FROM compliance_events WHERE status IN ('open', 'investigating')) as open_compliance_events,
    (SELECT COUNT(*) FROM compliance_events WHERE severity = 'high' AND status IN ('open', 'investigating')) as high_severity_compliance,
    
    -- Market data metrics
    (SELECT COUNT(*) FROM market_patterns WHERE status = 'active') as active_market_patterns,
    (SELECT COUNT(*) FROM market_anomalies WHERE status = 'active') as active_market_anomalies;

-- Real-time activity feed view
CREATE OR REPLACE VIEW v_realtime_activity_feed AS
SELECT 
    'trading' as activity_category,
    activity_id as id,
    timestamp,
    activity_type,
    CONCAT(action, ' ', quantity, ' ', instrument) as description,
    trader_id as user_id,
    severity,
    status
FROM trading_activity_log
WHERE timestamp >= date_sub(current_timestamp(), 1) -- Last 24 hours

UNION ALL

SELECT 
    'risk' as activity_category,
    activity_id as id,
    timestamp,
    activity_type,
    description,
    user_id,
    severity,
    status
FROM risk_activity_log
WHERE timestamp >= date_sub(current_timestamp(), 1) -- Last 24 hours

UNION ALL

SELECT 
    'compliance' as activity_category,
    event_id as id,
    timestamp,
    category as activity_type,
    message as description,
    trader_id as user_id,
    severity,
    status
FROM compliance_events
WHERE timestamp >= date_sub(current_timestamp(), 1) -- Last 24 hours

ORDER BY timestamp DESC
LIMIT 100;

-- ==================================================================
-- 2. CROSS-FUNCTIONAL ANALYTICAL VIEWS
-- ==================================================================

-- Portfolio performance view
CREATE OR REPLACE VIEW v_portfolio_performance AS
SELECT 
    p.portfolio,
    p.product,
    
    -- Position metrics
    SUM(pos.quantity) as total_quantity,
    SUM(pos.market_value) as total_market_value,
    SUM(pos.unrealized_pnl) as total_unrealized_pnl,
    
    -- P&L metrics
    SUM(p.pnl) as total_pnl,
    SUM(p.realized_pnl) as total_realized_pnl,
    AVG(p.pnl) as avg_daily_pnl,
    
    -- Risk metrics
    MAX(vr.var_95) as max_var_95,
    MAX(vr.var_99) as max_var_99,
    
    -- Trading activity
    COUNT(DISTINCT tal.activity_id) as trading_activities,
    COUNT(DISTINCT tal.trader_id) as active_traders,
    
    -- Last update
    MAX(GREATEST(
        COALESCE(pos.updated_at, '1900-01-01'),
        COALESCE(p.updated_at, '1900-01-01'),
        COALESCE(vr.updated_at, '1900-01-01')
    )) as last_updated

FROM pnl p
LEFT JOIN positions pos ON p.product = pos.product AND p.portfolio = pos.portfolio AND p.date = pos.date
LEFT JOIN var_results vr ON p.product = vr.product AND p.portfolio = vr.portfolio AND p.date = vr.date
LEFT JOIN trading_activity_log tal ON p.product = tal.instrument AND DATE(tal.timestamp) = p.date
WHERE p.date >= date_sub(current_date(), 30) -- Last 30 days
GROUP BY p.portfolio, p.product
ORDER BY total_pnl DESC;

-- Trader performance view
CREATE OR REPLACE VIEW v_trader_performance AS
SELECT 
    p.trader_id,
    p.portfolio,
    
    -- P&L performance
    SUM(p.pnl) as total_pnl,
    SUM(p.realized_pnl) as total_realized_pnl,
    SUM(p.unrealized_pnl) as total_unrealized_pnl,
    AVG(p.pnl) as avg_daily_pnl,
    STDDEV(p.pnl) as pnl_volatility,
    
    -- Trading metrics
    COUNT(DISTINCT p.product) as products_traded,
    COUNT(DISTINCT p.date) as trading_days,
    SUM(CASE WHEN p.pnl > 0 THEN 1 ELSE 0 END) as profitable_days,
    SUM(CASE WHEN p.pnl < 0 THEN 1 ELSE 0 END) as loss_days,
    
    -- Risk metrics
    COUNT(DISTINCT ra.activity_id) as risk_activities,
    COUNT(CASE WHEN ra.severity = 'high' THEN 1 END) as high_risk_activities,
    
    -- Compliance metrics
    COUNT(DISTINCT ce.event_id) as compliance_events,
    COUNT(CASE WHEN ce.severity = 'high' THEN 1 END) as high_severity_compliance,
    
    -- Performance ratios
    CASE WHEN STDDEV(p.pnl) > 0 THEN AVG(p.pnl) / STDDEV(p.pnl) ELSE NULL END as sharpe_ratio,
    CASE WHEN COUNT(DISTINCT p.date) > 0 THEN 
        CAST(SUM(CASE WHEN p.pnl > 0 THEN 1 ELSE 0 END) AS DOUBLE) / COUNT(DISTINCT p.date) 
    ELSE 0 END as win_rate

FROM pnl p
LEFT JOIN risk_activity_log ra ON p.trader_id = ra.user_id AND DATE(ra.timestamp) >= date_sub(current_date(), 30)
LEFT JOIN compliance_events ce ON p.trader_id = ce.trader_id AND DATE(ce.timestamp) >= date_sub(current_date(), 30)
WHERE p.date >= date_sub(current_date(), 30) -- Last 30 days
    AND p.trader_id IS NOT NULL
GROUP BY p.trader_id, p.portfolio
ORDER BY total_pnl DESC;

-- Product risk analysis view
CREATE OR REPLACE VIEW v_product_risk_analysis AS
SELECT 
    p.product,
    
    -- Current positions
    SUM(pos.quantity) as net_position,
    SUM(pos.market_value) as total_exposure,
    
    -- Risk metrics
    MAX(vr.var_95) as current_var_95,
    MAX(vr.var_99) as current_var_99,
    MAX(vr.expected_shortfall) as current_expected_shortfall,
    
    -- Historical volatility
    STDDEV(pnl.pnl) as pnl_volatility,
    MAX(pnl.pnl) as max_daily_pnl,
    MIN(pnl.pnl) as min_daily_pnl,
    
    -- Limit utilization
    MAX(el.utilization_pct) as max_limit_utilization,
    COUNT(CASE WHEN el.status = 'breach' THEN 1 END) as limit_breaches,
    COUNT(CASE WHEN el.status = 'warning' THEN 1 END) as limit_warnings,
    
    -- Alert frequency
    COUNT(DISTINCT ra.activity_id) as risk_alerts_30d,
    COUNT(CASE WHEN ra.severity = 'critical' THEN 1 END) as critical_alerts_30d,
    
    -- Market patterns
    COUNT(DISTINCT mp.pattern_id) as active_patterns,
    COUNT(DISTINCT ma.anomaly_id) as recent_anomalies,
    
    -- Last update
    MAX(GREATEST(
        COALESCE(pos.updated_at, '1900-01-01'),
        COALESCE(vr.updated_at, '1900-01-01'),
        COALESCE(pnl.updated_at, '1900-01-01')
    )) as last_updated

FROM positions pos
LEFT JOIN var_results vr ON pos.product = vr.product AND pos.date = vr.date
LEFT JOIN pnl ON pos.product = pnl.product AND pos.date = pnl.date
LEFT JOIN exposure_limits el ON pos.product = el.product
LEFT JOIN risk_activity_log ra ON pos.product = ra.product AND DATE(ra.timestamp) >= date_sub(current_date(), 30)
LEFT JOIN market_patterns mp ON pos.product = mp.instrument AND mp.status = 'active'
LEFT JOIN market_anomalies ma ON pos.product = ma.instrument AND DATE(ma.detection_timestamp) >= date_sub(current_date(), 7)
WHERE pos.date = (SELECT MAX(date) FROM positions p WHERE p.product = pos.product)
GROUP BY pos.product
ORDER BY total_exposure DESC;

-- ==================================================================
-- 3. OPERATIONAL ANALYTICS VIEWS
-- ==================================================================

-- Daily operations summary
CREATE OR REPLACE VIEW v_daily_operations_summary AS
SELECT 
    current_date() as summary_date,
    
    -- Trading operations
    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = current_date()) as trades_executed,
    (SELECT SUM(quantity * price) FROM trades WHERE DATE(timestamp) = current_date()) as total_trading_value,
    (SELECT COUNT(DISTINCT trader_id) FROM trading_activity_log WHERE DATE(timestamp) = current_date()) as active_traders,
    
    -- Risk operations
    (SELECT COUNT(*) FROM risk_alerts WHERE DATE(timestamp) = current_date()) as new_risk_alerts,
    (SELECT COUNT(*) FROM risk_activity_log WHERE DATE(timestamp) = current_date() AND activity_type = 'scenario_analysis') as scenarios_run,
    (SELECT COUNT(*) FROM var_results WHERE date = current_date()) as var_calculations,
    
    -- Compliance operations
    (SELECT COUNT(*) FROM compliance_events WHERE DATE(timestamp) = current_date()) as new_compliance_events,
    (SELECT COUNT(*) FROM trade_surveillance WHERE DATE(timestamp) = current_date()) as surveillance_alerts,
    (SELECT COUNT(*) FROM regulatory_reports WHERE report_date = current_date()) as regulatory_reports,
    
    -- System operations
    (SELECT COUNT(*) FROM audit_trail WHERE DATE(timestamp) = current_date()) as audit_events,
    (SELECT COUNT(DISTINCT user_id) FROM audit_trail WHERE DATE(timestamp) = current_date()) as active_users,
    
    -- Data quality
    (SELECT AVG(data_quality_score) FROM trades WHERE DATE(timestamp) = current_date()) as avg_trade_data_quality,
    (SELECT COUNT(*) FROM market_anomalies WHERE DATE(detection_timestamp) = current_date()) as data_anomalies_detected;

-- System health and performance view
CREATE OR REPLACE VIEW v_system_health AS
SELECT 
    'trading' as system_component,
    COUNT(*) as total_records,
    MAX(updated_at) as last_update,
    AVG(data_quality_score) as avg_data_quality,
    COUNT(CASE WHEN updated_at >= date_sub(current_timestamp(), 1) THEN 1 END) as records_last_24h
FROM trades
WHERE DATE(timestamp) >= date_sub(current_date(), 7)

UNION ALL

SELECT 
    'risk' as system_component,
    COUNT(*) as total_records,
    MAX(updated_at) as last_update,
    NULL as avg_data_quality,
    COUNT(CASE WHEN updated_at >= date_sub(current_timestamp(), 1) THEN 1 END) as records_last_24h
FROM risk_activity_log
WHERE DATE(timestamp) >= date_sub(current_date(), 7)

UNION ALL

SELECT 
    'compliance' as system_component,
    COUNT(*) as total_records,
    MAX(updated_at) as last_update,
    NULL as avg_data_quality,
    COUNT(CASE WHEN updated_at >= date_sub(current_timestamp(), 1) THEN 1 END) as records_last_24h
FROM compliance_events
WHERE DATE(timestamp) >= date_sub(current_date(), 7)

UNION ALL

SELECT 
    'market_data' as system_component,
    COUNT(*) as total_records,
    MAX(created_at) as last_update,
    NULL as avg_data_quality,
    COUNT(CASE WHEN created_at >= date_sub(current_timestamp(), 1) THEN 1 END) as records_last_24h
FROM market_patterns
WHERE DATE(detection_timestamp) >= date_sub(current_date(), 7);

-- ==================================================================
-- 4. BUSINESS INTELLIGENCE VIEWS
-- ==================================================================

-- Monthly business summary
CREATE OR REPLACE VIEW v_monthly_business_summary AS
SELECT 
    DATE_TRUNC('month', DATE(p.date)) as month,
    
    -- Financial performance
    SUM(p.pnl) as total_pnl,
    SUM(p.realized_pnl) as total_realized_pnl,
    SUM(p.unrealized_pnl) as total_unrealized_pnl,
    AVG(p.pnl) as avg_daily_pnl,
    
    -- Trading volume
    COUNT(DISTINCT t.trade_id) as total_trades,
    SUM(t.quantity * t.price) as total_trading_value,
    COUNT(DISTINCT t.instrument) as instruments_traded,
    COUNT(DISTINCT p.trader_id) as active_traders,
    
    -- Risk management
    AVG(vr.var_95) as avg_var_95,
    MAX(vr.var_95) as max_var_95,
    COUNT(DISTINCT ra.activity_id) as risk_activities,
    
    -- Compliance
    COUNT(DISTINCT ce.event_id) as compliance_events,
    COUNT(CASE WHEN ce.severity = 'high' THEN 1 END) as high_severity_compliance,
    
    -- Operational efficiency
    COUNT(DISTINCT p.product) as products_traded,
    COUNT(DISTINCT p.portfolio) as active_portfolios

FROM pnl p
LEFT JOIN trades t ON DATE(t.timestamp) = p.date
LEFT JOIN var_results vr ON p.product = vr.product AND p.date = vr.date
LEFT JOIN risk_activity_log ra ON p.product = ra.product AND DATE(ra.timestamp) = p.date
LEFT JOIN compliance_events ce ON DATE(ce.timestamp) = p.date
WHERE p.date >= date_sub(current_date(), 365) -- Last 12 months
GROUP BY DATE_TRUNC('month', DATE(p.date))
ORDER BY month DESC;

-- Product profitability ranking
CREATE OR REPLACE VIEW v_product_profitability_ranking AS
SELECT 
    p.product,
    
    -- P&L metrics
    SUM(p.pnl) as total_pnl,
    SUM(p.realized_pnl) as total_realized_pnl,
    AVG(p.pnl) as avg_daily_pnl,
    STDDEV(p.pnl) as pnl_volatility,
    
    -- Trading metrics
    COUNT(DISTINCT t.trade_id) as total_trades,
    SUM(t.quantity * t.price) as total_trading_value,
    COUNT(DISTINCT p.trader_id) as traders_involved,
    
    -- Risk-adjusted metrics
    CASE WHEN STDDEV(p.pnl) > 0 THEN AVG(p.pnl) / STDDEV(p.pnl) ELSE NULL END as risk_adjusted_return,
    MAX(vr.var_95) as max_var_95,
    
    -- Operational metrics
    COUNT(DISTINCT ra.activity_id) as risk_events,
    COUNT(DISTINCT ce.event_id) as compliance_events,
    
    -- Rankings
    ROW_NUMBER() OVER (ORDER BY SUM(p.pnl) DESC) as pnl_rank,
    ROW_NUMBER() OVER (ORDER BY SUM(t.quantity * t.price) DESC) as volume_rank,
    ROW_NUMBER() OVER (ORDER BY CASE WHEN STDDEV(p.pnl) > 0 THEN AVG(p.pnl) / STDDEV(p.pnl) ELSE NULL END DESC) as risk_adjusted_rank

FROM pnl p
LEFT JOIN trades t ON p.product = t.instrument AND DATE(t.timestamp) = p.date
LEFT JOIN var_results vr ON p.product = vr.product AND p.date = vr.date
LEFT JOIN risk_activity_log ra ON p.product = ra.product AND DATE(ra.timestamp) = p.date
LEFT JOIN compliance_events ce ON p.product = ce.product AND DATE(ce.timestamp) = p.date
WHERE p.date >= date_sub(current_date(), 90) -- Last 90 days
GROUP BY p.product
ORDER BY total_pnl DESC;

-- ==================================================================
-- 5. MATERIALIZED VIEWS FOR PERFORMANCE
-- ==================================================================

-- Create materialized view for real-time dashboard (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW mv_realtime_dashboard AS
SELECT 
    current_timestamp() as last_refresh,
    
    -- Current positions summary
    (SELECT COUNT(*) FROM positions WHERE date = (SELECT MAX(date) FROM positions)) as total_positions,
    (SELECT SUM(market_value) FROM positions WHERE date = (SELECT MAX(date) FROM positions)) as total_market_value,
    (SELECT SUM(unrealized_pnl) FROM positions WHERE date = (SELECT MAX(date) FROM positions)) as total_unrealized_pnl,
    
    -- Today's P&L
    (SELECT COALESCE(SUM(pnl), 0) FROM pnl WHERE date = current_date()) as pnl_today,
    (SELECT COALESCE(SUM(realized_pnl), 0) FROM pnl WHERE date = current_date()) as realized_pnl_today,
    
    -- Active alerts
    (SELECT COUNT(*) FROM risk_alerts WHERE status = 'active') as active_risk_alerts,
    (SELECT COUNT(*) FROM compliance_events WHERE status IN ('open', 'investigating')) as open_compliance_events,
    
    -- Market conditions
    (SELECT COUNT(*) FROM market_patterns WHERE status = 'active') as active_patterns,
    (SELECT COUNT(*) FROM market_anomalies WHERE status = 'active' AND DATE(detection_timestamp) = current_date()) as todays_anomalies,
    
    -- System activity
    (SELECT COUNT(*) FROM trading_activity_log WHERE DATE(timestamp) = current_date()) as trading_activities_today,
    (SELECT COUNT(DISTINCT trader_id) FROM trading_activity_log WHERE DATE(timestamp) = current_date()) as active_traders_today;

-- ==================================================================
-- 6. DATA QUALITY AND MONITORING VIEWS
-- ==================================================================

-- Data quality monitoring view
CREATE OR REPLACE VIEW v_data_quality_monitor AS
SELECT 
    'trades' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN data_quality_score >= 0.9 THEN 1 END) as high_quality_records,
    AVG(data_quality_score) as avg_quality_score,
    MIN(data_quality_score) as min_quality_score,
    MAX(updated_at) as last_update
FROM trades
WHERE DATE(timestamp) >= date_sub(current_date(), 7)

UNION ALL

SELECT 
    'positions' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN data_quality_score >= 0.9 THEN 1 END) as high_quality_records,
    AVG(data_quality_score) as avg_quality_score,
    MIN(data_quality_score) as min_quality_score,
    MAX(updated_at) as last_update
FROM positions
WHERE DATE(date) >= date_sub(current_date(), 7)

UNION ALL

SELECT 
    'var_results' as table_name,
    COUNT(*) as total_records,
    NULL as high_quality_records,
    NULL as avg_quality_score,
    NULL as min_quality_score,
    MAX(updated_at) as last_update
FROM var_results
WHERE DATE(date) >= date_sub(current_date(), 7);

-- Record count monitoring view
CREATE OR REPLACE VIEW v_record_count_monitor AS
SELECT 
    current_date() as monitoring_date,
    
    -- Core tables
    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = current_date()) as trades_today,
    (SELECT COUNT(*) FROM positions WHERE date = current_date()) as positions_today,
    (SELECT COUNT(*) FROM pnl WHERE date = current_date()) as pnl_records_today,
    
    -- Activity tables
    (SELECT COUNT(*) FROM trading_activity_log WHERE DATE(timestamp) = current_date()) as trading_activities_today,
    (SELECT COUNT(*) FROM risk_activity_log WHERE DATE(timestamp) = current_date()) as risk_activities_today,
    (SELECT COUNT(*) FROM compliance_events WHERE DATE(timestamp) = current_date()) as compliance_events_today,
    
    -- Historical comparison
    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = date_sub(current_date(), 1)) as trades_yesterday,
    (SELECT COUNT(*) FROM trading_activity_log WHERE DATE(timestamp) = date_sub(current_date(), 1)) as trading_activities_yesterday,
    
    -- Growth rates
    CASE WHEN (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = date_sub(current_date(), 1)) > 0 
         THEN ROUND(((SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = current_date()) - 
                    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = date_sub(current_date(), 1))) * 100.0 / 
                    (SELECT COUNT(*) FROM trades WHERE DATE(timestamp) = date_sub(current_date(), 1)), 2)
         ELSE NULL END as trades_growth_pct;

-- ==================================================================
-- Refresh materialized views (to be scheduled)
-- ==================================================================

-- This would typically be scheduled to run every 15 minutes
-- REFRESH MATERIALIZED VIEW mv_realtime_dashboard;

-- ==================================================================
-- Grant permissions for views
-- ==================================================================

-- Grant read access to all views for analysts and dashboard users
-- GRANT SELECT ON ALL VIEWS IN SCHEMA energy_market_intelligence TO `dashboard_users`;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA energy_market_intelligence TO `business_analysts`;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA energy_market_intelligence TO `risk_managers`;

-- ==================================================================
-- End of Unified Views and Analytical Tables
-- ==================================================================
