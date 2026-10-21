from fastapi import APIRouter, Query
from typing import List, Optional
import json
from datetime import datetime, timedelta
import random
import uuid

from app.schemas.risk import (
    Position, VarResult, ExposureLimit, RiskAlert, ScenarioAnalysis,
    StressTestResult, VarSensitivity, HedgeEffectiveness, RiskActivity,
    RiskDashboardSummary
)
from app.services.mock.loader import get_mock_loader

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("/positions", response_model=List[Position])
async def list_positions() -> List[Position]:
    loader = get_mock_loader()
    data = loader.load_json("positions.json")
    return [Position(**x) for x in data]


@router.get("/var", response_model=List[VarResult])
async def list_var() -> List[VarResult]:
    loader = get_mock_loader()
    data = loader.load_json("var_results.json")
    return [VarResult(**x) for x in data]


@router.get("/dashboard-summary", response_model=RiskDashboardSummary)
async def get_dashboard_summary() -> RiskDashboardSummary:
    """Get high-level risk dashboard summary"""
    return RiskDashboardSummary(
        total_exposure=125_500_000.0,
        total_var_95=8_750_000.0,
        total_var_99=12_200_000.0,
        active_alerts=7,
        critical_alerts=2,
        portfolio_count=12,
        hedge_effectiveness_avg=0.847,
        last_updated=datetime.now().isoformat()
    )


@router.get("/exposure-limits", response_model=List[ExposureLimit])
async def get_exposure_limits() -> List[ExposureLimit]:
    """Get current exposure limits and utilization"""
    return [
        ExposureLimit(
            product="WTI_Crude",
            portfolio="Energy_Portfolio",
            limit_type="market",
            current_exposure=15_500_000.0,
            limit_value=20_000_000.0,
            utilization_pct=77.5,
            status="warning",
            last_updated=datetime.now().isoformat()
        ),
        ExposureLimit(
            product="Natural_Gas",
            portfolio="Gas_Portfolio",
            limit_type="market",
            current_exposure=8_200_000.0,
            limit_value=12_000_000.0,
            utilization_pct=68.3,
            status="ok",
            last_updated=datetime.now().isoformat()
        ),
        ExposureLimit(
            product="Brent_Crude",
            portfolio="Oil_Portfolio",
            limit_type="credit",
            current_exposure=22_800_000.0,
            limit_value=25_000_000.0,
            utilization_pct=91.2,
            status="breach",
            last_updated=datetime.now().isoformat()
        ),
        ExposureLimit(
            product="Gold",
            portfolio="Metals_Portfolio",
            limit_type="concentration",
            current_exposure=5_100_000.0,
            limit_value=8_000_000.0,
            utilization_pct=63.8,
            status="ok",
            last_updated=datetime.now().isoformat()
        )
    ]


@router.get("/alerts", response_model=List[RiskAlert])
async def get_risk_alerts(status: Optional[str] = Query(None)) -> List[RiskAlert]:
    """Get risk alerts, optionally filtered by status"""
    alerts = [
        RiskAlert(
            alert_id="alert_001",
            timestamp=(datetime.now() - timedelta(minutes=15)).isoformat(),
            severity="critical",
            alert_type="limit_breach",
            product="Brent_Crude",
            description="Credit exposure limit breached for Oil Portfolio",
            current_value=22_800_000.0,
            threshold_value=25_000_000.0,
            status="active"
        ),
        RiskAlert(
            alert_id="alert_002",
            timestamp=(datetime.now() - timedelta(hours=2)).isoformat(),
            severity="high",
            alert_type="var_threshold",
            product="WTI_Crude",
            description="VaR 95% approaching threshold",
            current_value=4_750_000.0,
            threshold_value=5_000_000.0,
            status="acknowledged"
        ),
        RiskAlert(
            alert_id="alert_003",
            timestamp=(datetime.now() - timedelta(hours=4)).isoformat(),
            severity="medium",
            alert_type="hedge_effectiveness",
            product="Natural_Gas",
            description="Hedge effectiveness below target",
            current_value=0.72,
            threshold_value=0.80,
            status="active"
        )
    ]
    
    if status:
        alerts = [a for a in alerts if a.status == status]
    
    return alerts


@router.get("/var-sensitivity", response_model=List[VarSensitivity])
async def get_var_sensitivity() -> List[VarSensitivity]:
    """Get VaR sensitivity analysis by product and portfolio"""
    return [
        VarSensitivity(
            product="WTI_Crude",
            portfolio="Energy_Portfolio",
            var_95=4_750_000.0,
            var_99=6_200_000.0,
            expected_shortfall=7_100_000.0,
            price_sensitivity=0.85,
            volatility_sensitivity=1.23,
            correlation_sensitivity=0.67,
            duration_risk=0.12
        ),
        VarSensitivity(
            product="Natural_Gas",
            portfolio="Gas_Portfolio",
            var_95=2_100_000.0,
            var_99=2_850_000.0,
            expected_shortfall=3_200_000.0,
            price_sensitivity=1.12,
            volatility_sensitivity=1.45,
            correlation_sensitivity=0.89
        ),
        VarSensitivity(
            product="Brent_Crude",
            portfolio="Oil_Portfolio",
            var_95=3_200_000.0,
            var_99=4_100_000.0,
            expected_shortfall=4_800_000.0,
            price_sensitivity=0.92,
            volatility_sensitivity=1.18,
            correlation_sensitivity=0.74,
            duration_risk=0.08
        )
    ]


@router.post("/scenario-analysis", response_model=ScenarioAnalysis)
async def run_scenario_analysis(
    scenario_name: str,
    price_change_pct: float = 0.0,
    volatility_multiplier: float = 1.0,
    correlation_shock: float = 0.0
) -> ScenarioAnalysis:
    """Run scenario analysis with specified parameters"""
    base_value = 125_500_000.0
    
    # Simple scenario calculation (in real implementation, this would be more sophisticated)
    impact_factor = (price_change_pct / 100) * 0.8 + (volatility_multiplier - 1) * 0.3 + correlation_shock * 0.2
    stressed_value = base_value * (1 + impact_factor)
    impact_amount = stressed_value - base_value
    impact_percentage = (impact_amount / base_value) * 100
    
    return ScenarioAnalysis(
        scenario_id=str(uuid.uuid4()),
        scenario_name=scenario_name,
        description=f"Price change: {price_change_pct}%, Volatility: {volatility_multiplier}x, Correlation shock: {correlation_shock}",
        parameters={
            "price_change_pct": price_change_pct,
            "volatility_multiplier": volatility_multiplier,
            "correlation_shock": correlation_shock
        },
        base_portfolio_value=base_value,
        stressed_portfolio_value=stressed_value,
        impact_amount=impact_amount,
        impact_percentage=impact_percentage,
        created_at=datetime.now().isoformat()
    )


@router.post("/stress-test", response_model=List[StressTestResult])
async def run_stress_test(
    test_name: str,
    stress_factor: float = 2.0
) -> List[StressTestResult]:
    """Run stress test across all portfolios"""
    products = ["WTI_Crude", "Natural_Gas", "Brent_Crude", "Gold"]
    portfolios = ["Energy_Portfolio", "Gas_Portfolio", "Oil_Portfolio", "Metals_Portfolio"]
    
    results = []
    for i, (product, portfolio) in enumerate(zip(products, portfolios)):
        base_var = random.uniform(1_000_000, 5_000_000)
        stressed_var = base_var * stress_factor * random.uniform(0.8, 1.2)
        var_change_pct = ((stressed_var - base_var) / base_var) * 100
        projected_loss = stressed_var * random.uniform(1.2, 1.8)
        
        results.append(StressTestResult(
            test_id=f"stress_{uuid.uuid4().hex[:8]}",
            test_name=test_name,
            stress_factor=stress_factor,
            product=product,
            portfolio=portfolio,
            base_var=base_var,
            stressed_var=stressed_var,
            var_change_pct=var_change_pct,
            projected_loss=projected_loss,
            confidence_level=0.95
        ))
    
    return results


@router.get("/hedge-effectiveness", response_model=List[HedgeEffectiveness])
async def get_hedge_effectiveness() -> List[HedgeEffectiveness]:
    """Get hedge effectiveness analysis"""
    return [
        HedgeEffectiveness(
            hedge_id="hedge_001",
            product="WTI_Crude",
            portfolio="Energy_Portfolio",
            hedge_instrument="WTI_Futures",
            hedge_ratio=0.75,
            effectiveness_ratio=0.89,
            residual_risk=2_100_000.0,
            hedge_cost=125_000.0,
            recommendation="Maintain current hedge ratio",
            optimal_ratio=0.78
        ),
        HedgeEffectiveness(
            hedge_id="hedge_002",
            product="Natural_Gas",
            portfolio="Gas_Portfolio",
            hedge_instrument="NG_Swaps",
            hedge_ratio=0.65,
            effectiveness_ratio=0.72,
            residual_risk=3_200_000.0,
            hedge_cost=89_000.0,
            recommendation="Increase hedge ratio to 0.80",
            optimal_ratio=0.80
        ),
        HedgeEffectiveness(
            hedge_id="hedge_003",
            product="Brent_Crude",
            portfolio="Oil_Portfolio",
            hedge_instrument="Brent_Options",
            hedge_ratio=0.85,
            effectiveness_ratio=0.94,
            residual_risk=1_800_000.0,
            hedge_cost=156_000.0,
            recommendation="Excellent hedge performance",
            optimal_ratio=0.85
        )
    ]


@router.get("/activity-log", response_model=List[RiskActivity])
async def get_risk_activity_log(
    limit: int = Query(50, le=200),
    activity_type: Optional[str] = Query(None)
) -> List[RiskActivity]:
    """Get risk activity log from Databricks (mock implementation)"""
    # In real implementation, this would query the Databricks table
    activities = [
        RiskActivity(
            activity_id="act_001",
            timestamp=(datetime.now() - timedelta(minutes=5)).isoformat(),
            activity_type="limit_breach",
            category="alert",
            severity="critical",
            product="Brent_Crude",
            portfolio="Oil_Portfolio",
            description="Credit exposure limit breached",
            metric_name="credit_exposure",
            metric_value=22_800_000.0,
            threshold_value=25_000_000.0,
            status="active",
            user_id="risk_manager_001",
            tags=["credit_risk", "urgent"]
        ),
        RiskActivity(
            activity_id="act_002",
            timestamp=(datetime.now() - timedelta(minutes=15)).isoformat(),
            activity_type="scenario_analysis",
            category="analysis",
            severity="medium",
            product="WTI_Crude",
            portfolio="Energy_Portfolio",
            description="Completed stress test scenario: Oil price shock +25%",
            status="resolved",
            user_id="analyst_002",
            tags=["stress_test", "scenario"]
        ),
        RiskActivity(
            activity_id="act_003",
            timestamp=(datetime.now() - timedelta(hours=1)).isoformat(),
            activity_type="hedge_optimization",
            category="optimization",
            severity="medium",
            product="Natural_Gas",
            portfolio="Gas_Portfolio",
            description="Hedge effectiveness below threshold, optimization recommended",
            metric_name="hedge_effectiveness",
            metric_value=0.72,
            threshold_value=0.80,
            status="acknowledged",
            user_id="trader_003",
            tags=["hedge", "optimization"]
        ),
        RiskActivity(
            activity_id="act_004",
            timestamp=(datetime.now() - timedelta(hours=2)).isoformat(),
            activity_type="var_calculation",
            category="monitoring",
            severity="low",
            product="Gold",
            portfolio="Metals_Portfolio",
            description="Daily VaR calculation completed",
            metric_name="var_95",
            metric_value=1_250_000.0,
            status="resolved",
            user_id="system",
            tags=["var", "daily_calc"]
        )
    ]
    
    if activity_type:
        activities = [a for a in activities if a.activity_type == activity_type]
    
    return activities[:limit]

