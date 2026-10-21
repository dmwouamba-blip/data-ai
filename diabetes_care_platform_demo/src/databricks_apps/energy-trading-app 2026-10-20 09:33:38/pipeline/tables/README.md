# ETRM Data 360 Pipeline Tables

## Overview

This directory contains SQL scripts to create database tables and views that are fully aligned with the ETRM Data 360 backend schemas and API expectations. The tables are designed to replace mock data with real pipeline data while maintaining complete compatibility with existing frontend components.

## Architecture

The pipeline follows a structured approach with tables organized by functional domain:

```
pipeline/tables/
├── 00_master_deployment.sql      # Master deployment script
├── 01_trading_tables.sql          # Trading and market data tables
├── 02_risk_tables.sql             # Risk management tables
├── 03_compliance_finance_tables.sql # Compliance and finance tables
└── 04_unified_views_analytics.sql  # Cross-functional views and analytics
```

## Table Categories

### 1. Trading Tables (`01_trading_tables.sql`)

**Core Tables:**
- `trades` - Individual trade records (matches `Trade` schema)
- `trading_activity_log` - Trading activities and events
- `price_forecasts` - AI-powered price predictions
- `market_patterns` - Detected market patterns and signals
- `market_anomalies` - Market anomaly detection results
- `market_microstructure` - Order book and liquidity data

**Backend API Alignment:**
- `/trading/trades` → `trades` table
- `/trading/trading-activities` → `trading_activity_log` table
- `/trading/price-forecast/{instrument}` → `price_forecasts` table
- `/trading/market-patterns` → `market_patterns` + `market_anomalies` tables
- `/trading/market-microstructure/{instrument}` → `market_microstructure` table

### 2. Risk Management Tables (`02_risk_tables.sql`)

**Core Tables:**
- `positions` - Current positions (matches `Position` schema)
- `var_results` - Value at Risk calculations (matches `VarResult` schema)
- `exposure_limits` - Exposure limits and utilization (matches `ExposureLimit` schema)
- `risk_alerts` - Risk alerts and notifications (matches `RiskAlert` schema)
- `scenario_analysis` - Scenario analysis results (matches `ScenarioAnalysis` schema)
- `stress_test_results` - Stress test outcomes (matches `StressTestResult` schema)
- `var_sensitivity` - VaR sensitivity analysis (matches `VarSensitivity` schema)
- `hedge_effectiveness` - Hedge effectiveness metrics (matches `HedgeEffectiveness` schema)
- `risk_activity_log` - Risk management activities (matches `RiskActivity` schema)
- `risk_dashboard_summary` - Dashboard summary metrics (matches `RiskDashboardSummary` schema)

**Backend API Alignment:**
- `/risk/positions` → `positions` table
- `/risk/var` → `var_results` table
- `/risk/exposure-limits` → `exposure_limits` table
- `/risk/alerts` → `risk_alerts` table
- `/risk/scenario-analysis` → `scenario_analysis` table
- `/risk/stress-test` → `stress_test_results` table
- `/risk/var-sensitivity` → `var_sensitivity` table
- `/risk/hedge-effectiveness` → `hedge_effectiveness` table
- `/risk/activity-log` → `risk_activity_log` table
- `/risk/dashboard-summary` → `risk_dashboard_summary` table

### 3. Compliance & Finance Tables (`03_compliance_finance_tables.sql`)

**Core Tables:**
- `compliance_events` - Compliance events and violations (matches `ComplianceEvent` schema)
- `pnl` - Profit & Loss records (matches `PnL` schema)
- `regulatory_reports` - Regulatory reporting status
- `trade_surveillance` - Trade surveillance alerts
- `kyc_records` - Know Your Customer records
- `audit_trail` - System audit trail

**Backend API Alignment:**
- Compliance events match the `ComplianceEvent` schema exactly
- P&L records match the `PnL` schema with additional breakdown fields
- Additional tables support comprehensive compliance and audit requirements

### 4. Unified Views & Analytics (`04_unified_views_analytics.sql`)

**Key Views:**
- `v_master_dashboard` - Master dashboard metrics
- `v_realtime_activity_feed` - Real-time activity across all systems
- `v_portfolio_performance` - Portfolio performance analytics
- `v_trader_performance` - Trader performance metrics
- `v_product_risk_analysis` - Product-level risk analysis
- `v_daily_operations_summary` - Daily operational metrics
- `v_monthly_business_summary` - Monthly business intelligence
- `mv_realtime_dashboard` - Materialized view for high-performance dashboard queries

## Schema Alignment

### Data Types and Formats

All tables use consistent data types that match the backend Pydantic schemas:

- **Timestamps**: ISO datetime format strings (`STRING` type for API compatibility)
- **Dates**: ISO date format strings (`STRING` type for API compatibility)
- **IDs**: String identifiers for flexibility and consistency
- **Numeric Values**: `DOUBLE` for financial amounts and metrics
- **Status Fields**: String enums matching backend schema literals
- **Arrays**: Native Delta Lake arrays for tags and collections
- **JSON**: String fields for complex nested data

### Field Mapping

Every field in the backend schemas has a corresponding column in the pipeline tables:

```sql
-- Backend Trade schema
class Trade(BaseModel):
    trade_id: str
    instrument: str
    counterparty: str
    side: str  # BUY/SELL
    quantity: float
    price: float
    currency: str
    trade_date: str  # ISO date
    settle_date: Optional[str] = None
    timestamp: Optional[str] = None  # ISO datetime

-- Pipeline trades table
CREATE TABLE trades (
    trade_id STRING NOT NULL,           -- ✓ Exact match
    instrument STRING NOT NULL,         -- ✓ Exact match
    counterparty STRING NOT NULL,       -- ✓ Exact match
    side STRING NOT NULL,               -- ✓ Exact match (BUY/SELL)
    quantity DOUBLE NOT NULL,           -- ✓ Compatible (float → DOUBLE)
    price DOUBLE NOT NULL,              -- ✓ Compatible (float → DOUBLE)
    currency STRING NOT NULL,           -- ✓ Exact match
    trade_date STRING NOT NULL,         -- ✓ Exact match (ISO date)
    settle_date STRING,                 -- ✓ Exact match (Optional)
    timestamp STRING,                   -- ✓ Exact match (Optional ISO datetime)
    -- Additional pipeline fields...
);
```

## Deployment

### Prerequisites

1. **Databricks Environment**: Unity Catalog enabled workspace
2. **Permissions**: `CREATE TABLE` and `CREATE VIEW` permissions on the target catalog/schema
3. **Catalog Structure**: 
   ```
   totalenergies (catalog)
   └── energy_market_intelligence (schema)
   ```

### Deployment Steps

1. **Execute Master Deployment Script**:
   ```sql
   -- In Databricks SQL or notebook
   %sql
   SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/00_master_deployment.sql';
   ```

2. **Verify Deployment**:
   ```sql
   -- Check tables were created
   SHOW TABLES IN totalenergies.energy_market_intelligence;
   
   -- Check views were created
   SHOW VIEWS IN totalenergies.energy_market_intelligence;
   
   -- Validate sample data
   SELECT * FROM totalenergies.energy_market_intelligence.v_master_dashboard;
   ```

3. **Set Up Scheduled Refreshes**:
   ```sql
   -- Schedule materialized view refresh (every 15 minutes)
   REFRESH MATERIALIZED VIEW totalenergies.energy_market_intelligence.mv_realtime_dashboard;
   ```

### Alternative: Individual Script Execution

If you prefer to deploy components individually:

```sql
-- Step 1: Trading tables
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/01_trading_tables.sql';

-- Step 2: Risk tables  
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/02_risk_tables.sql';

-- Step 3: Compliance & Finance tables
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/03_compliance_finance_tables.sql';

-- Step 4: Views & Analytics
SOURCE '/Workspace/Repos/etrm-data-360/pipeline/tables/04_unified_views_analytics.sql';
```

## Backend Integration

### API Endpoint Updates

To integrate with the new pipeline tables, update the backend API endpoints to query the database instead of using mock data:

```python
# Before (mock data)
@router.get("/trades", response_model=List[Trade])
async def list_trades() -> List[Trade]:
    loader = get_mock_loader()
    data = loader.load_json("trades.json")
    return [Trade(**t) for t in data]

# After (pipeline data)
@router.get("/trades", response_model=List[Trade])
async def list_trades() -> List[Trade]:
    query = "SELECT * FROM totalenergies.energy_market_intelligence.trades ORDER BY timestamp DESC LIMIT 100"
    results = await execute_databricks_query(query)
    return [Trade(**row) for row in results]
```

### Database Connection

Add Databricks SQL connection to your backend:

```python
# backend/app/services/databricks_sql.py
from databricks import sql
import os

def get_databricks_connection():
    return sql.connect(
        server_hostname=os.getenv("DATABRICKS_SERVER_HOSTNAME"),
        http_path=os.getenv("DATABRICKS_HTTP_PATH"),
        access_token=os.getenv("DATABRICKS_TOKEN")
    )

async def execute_query(query: str):
    with get_databricks_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            return cursor.fetchall()
```

## Data Pipeline Integration

### ETL Process

The tables are designed to be populated by ETL processes that:

1. **Extract** data from source systems (trading platforms, risk engines, compliance systems)
2. **Transform** data to match the schema requirements
3. **Load** data into the appropriate tables with proper partitioning

### Real-time Updates

For real-time updates, consider:

1. **Change Data Capture (CDC)** from source systems
2. **Streaming ingestion** using Databricks Structured Streaming
3. **Event-driven updates** via message queues (Kafka, Event Hubs)

### Data Quality

Built-in data quality features:

- **Data quality scores** in core tables
- **Audit trails** for all changes
- **Validation views** for monitoring data health
- **Automated statistics** computation for performance

## Performance Optimization

### Partitioning Strategy

Tables are partitioned for optimal query performance:

- **Time-based partitioning**: By date/timestamp for time-series queries
- **Category partitioning**: By product, portfolio, or instrument for filtered queries
- **Composite partitioning**: Multiple columns where appropriate

### Indexing

Strategic indexes are created on:

- **Primary keys** and **foreign keys**
- **Frequently filtered columns** (timestamp, product, severity)
- **Join columns** for cross-table queries

### Materialized Views

High-performance materialized views for:

- **Real-time dashboards** (refreshed every 15 minutes)
- **Complex aggregations** (daily/monthly summaries)
- **Cross-functional analytics** (portfolio performance, trader metrics)

## Monitoring and Maintenance

### Data Quality Monitoring

Built-in views for monitoring:

- `v_data_quality_monitor` - Data quality scores and metrics
- `v_record_count_monitor` - Record count trends and anomalies
- `v_system_health` - Overall system health indicators

### Maintenance Tasks

Regular maintenance includes:

1. **OPTIMIZE** tables for performance (weekly)
2. **VACUUM** old versions for storage optimization (monthly)
3. **ANALYZE** tables for query optimization (daily)
4. **REFRESH** materialized views (every 15 minutes)

### Alerting

Set up alerts for:

- **Data quality degradation** (quality scores below threshold)
- **Missing data** (expected records not arriving)
- **Performance issues** (query response times)
- **Storage growth** (unexpected data volume increases)

## Security and Compliance

### Access Control

Implement proper access controls:

```sql
-- Grant read access to analysts
GRANT SELECT ON totalenergies.energy_market_intelligence.* TO `trading_analysts`;

-- Grant write access to ETL processes
GRANT INSERT, UPDATE ON totalenergies.energy_market_intelligence.* TO `etl_service_principal`;

-- Grant admin access to data engineers
GRANT ALL PRIVILEGES ON totalenergies.energy_market_intelligence.* TO `data_engineers`;
```

### Data Classification

Tables include data classification:

- **Confidential**: Trading positions, P&L data
- **Internal**: Risk metrics, compliance events
- **Public**: Market data, general statistics

### Audit Trail

Comprehensive audit logging:

- **All data changes** logged in `audit_trail` table
- **User actions** tracked with timestamps and IP addresses
- **System operations** recorded for compliance

## Troubleshooting

### Common Issues

1. **Permission Errors**:
   ```sql
   -- Check current permissions
   SHOW GRANTS ON CATALOG totalenergies;
   SHOW GRANTS ON SCHEMA totalenergies.energy_market_intelligence;
   ```

2. **Performance Issues**:
   ```sql
   -- Check table statistics
   DESCRIBE DETAIL totalenergies.energy_market_intelligence.trades;
   
   -- Optimize if needed
   OPTIMIZE totalenergies.energy_market_intelligence.trades;
   ```

3. **Data Quality Issues**:
   ```sql
   -- Check data quality metrics
   SELECT * FROM totalenergies.energy_market_intelligence.v_data_quality_monitor;
   ```

### Support

For issues or questions:

1. Check the deployment validation output
2. Review the data quality monitoring views
3. Consult the system health indicators
4. Contact the data engineering team

## Future Enhancements

### Planned Features

1. **Real-time streaming** ingestion from source systems
2. **Advanced analytics** with ML model integration
3. **Cross-market** correlation analysis
4. **Regulatory reporting** automation
5. **Advanced alerting** with machine learning

### Extensibility

The schema is designed for easy extension:

- **Add new columns** without breaking existing queries
- **Create new tables** following the same patterns
- **Extend views** with additional metrics
- **Add new indexes** for performance optimization

---

## Summary

This pipeline table structure provides:

✅ **Complete Backend Alignment** - All schemas match exactly
✅ **High Performance** - Optimized partitioning and indexing  
✅ **Data Quality** - Built-in monitoring and validation
✅ **Scalability** - Designed for enterprise-scale data volumes
✅ **Maintainability** - Clear structure and comprehensive documentation
✅ **Security** - Proper access controls and audit trails
✅ **Flexibility** - Easy to extend and modify

The tables are ready for production use and will seamlessly integrate with the existing ETRM Data 360 backend and frontend components.
