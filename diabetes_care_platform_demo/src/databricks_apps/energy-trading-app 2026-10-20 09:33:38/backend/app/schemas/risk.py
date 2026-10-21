from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime


class Position(BaseModel):
    date: str  # ISO date
    product: str
    quantity: float


class VarResult(BaseModel):
    date: str
    product: str
    var_95: float
    var_99: float


class ExposureLimit(BaseModel):
    product: str
    portfolio: str
    limit_type: str  # 'market', 'credit', 'concentration'
    current_exposure: float
    limit_value: float
    utilization_pct: float
    status: str  # 'ok', 'warning', 'breach'
    last_updated: str


class RiskAlert(BaseModel):
    alert_id: str
    timestamp: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    alert_type: str
    product: str
    description: str
    current_value: float
    threshold_value: float
    status: str  # 'active', 'acknowledged', 'resolved'


class ScenarioAnalysis(BaseModel):
    scenario_id: str
    scenario_name: str
    description: str
    parameters: Dict[str, Any]
    base_portfolio_value: float
    stressed_portfolio_value: float
    impact_amount: float
    impact_percentage: float
    created_at: str


class StressTestResult(BaseModel):
    test_id: str
    test_name: str
    stress_factor: float
    product: str
    portfolio: str
    base_var: float
    stressed_var: float
    var_change_pct: float
    projected_loss: float
    confidence_level: float


class VarSensitivity(BaseModel):
    product: str
    portfolio: str
    var_95: float
    var_99: float
    expected_shortfall: float
    price_sensitivity: float
    volatility_sensitivity: float
    correlation_sensitivity: float
    duration_risk: Optional[float] = None


class HedgeEffectiveness(BaseModel):
    hedge_id: str
    product: str
    portfolio: str
    hedge_instrument: str
    hedge_ratio: float
    effectiveness_ratio: float
    residual_risk: float
    hedge_cost: float
    recommendation: str
    optimal_ratio: Optional[float] = None


class RiskActivity(BaseModel):
    activity_id: str
    timestamp: str
    activity_type: str
    category: str
    severity: str
    product: Optional[str] = None
    portfolio: Optional[str] = None
    description: str
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold_value: Optional[float] = None
    status: str
    user_id: Optional[str] = None
    tags: List[str] = []


class RiskDashboardSummary(BaseModel):
    total_exposure: float
    total_var_95: float
    total_var_99: float
    active_alerts: int
    critical_alerts: int
    portfolio_count: int
    hedge_effectiveness_avg: float
    last_updated: str

