from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime, timedelta
import random

from app.schemas.trading import Trade
from app.services.mock.loader import get_mock_loader

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/trades", response_model=List[Trade])
async def list_trades() -> List[Trade]:
    loader = get_mock_loader()
    data = loader.load_json("trades.json")
    return [Trade(**t) for t in data]


@router.get("/price-forecast/{instrument}")
async def get_price_forecast(instrument: str) -> Dict[str, Any]:
    """Get AI-powered price forecast for an instrument"""
    base_price = 75.50 if instrument == "WTI_CRUDE" else 2.85
    forecast_data = []
    
    for i in range(-24, 49):  # 24h historical + 48h forecast
        timestamp = (datetime.now() + timedelta(hours=i)).isoformat()
        noise = (random.random() - 0.5) * 2
        trend = i * 0.1 if i > 0 else 0
        predicted_price = base_price + trend + noise * 0.5
        confidence_range = abs(i) * 0.2 + 1.5
        
        forecast_data.append({
            "timestamp": timestamp,
            "predicted_price": predicted_price,
            "confidence_upper": predicted_price + confidence_range,
            "confidence_lower": predicted_price - confidence_range,
            "is_historical": i <= 0
        })
    
    return {
        "instrument": instrument,
        "forecast_data": forecast_data,
        "model_accuracy": 87.3,
        "confidence_level": 0.85,
        "last_updated": datetime.now().isoformat()
    }


@router.get("/market-patterns")
async def get_market_patterns() -> Dict[str, Any]:
    """Get detected market patterns and anomalies"""
    patterns = [
        {
            "pattern_id": "pat_001",
            "pattern_type": "Head and Shoulders",
            "instrument": "WTI Crude",
            "confidence_score": 0.89,
            "expected_direction": "DOWN",
            "time_horizon": "2-4 hours",
            "risk_level": "HIGH"
        },
        {
            "pattern_id": "pat_002", 
            "pattern_type": "Ascending Triangle",
            "instrument": "Natural Gas",
            "confidence_score": 0.76,
            "expected_direction": "UP", 
            "time_horizon": "4-8 hours",
            "risk_level": "MEDIUM"
        }
    ]
    
    anomalies = [
        {
            "anomaly_id": "ano_001",
            "anomaly_type": "Volume Spike",
            "instrument": "RBOB Gasoline", 
            "deviation_score": 4.2,
            "requires_attention": True
        }
    ]
    
    return {
        "patterns": patterns,
        "anomalies": anomalies,
        "detection_timestamp": datetime.now().isoformat()
    }


@router.get("/trading-activities")
async def get_trading_activities() -> Dict[str, Any]:
    """Get recent trading activities for the activity table"""
    activities = [
        {
            "activity_id": "trd_001",
            "timestamp": (datetime.now() - timedelta(minutes=2)).isoformat(),
            "activity_type": "order_execution",
            "trader_id": "trader.sarah",
            "instrument": "WTI Crude",
            "action": "BUY",
            "quantity": 500,
            "price": 75.45,
            "status": "executed",
            "compliance_check": True,
            "risk_score": 0.3
        },
        {
            "activity_id": "trd_002", 
            "timestamp": (datetime.now() - timedelta(minutes=8)).isoformat(),
            "activity_type": "risk_alert",
            "trader_id": "risk.manager",
            "instrument": "Natural Gas",
            "action": "RISK_LIMIT_BREACH", 
            "status": "pending",
            "compliance_check": False,
            "risk_score": 0.85
        }
    ]
    
    return {
        "activities": activities,
        "total_count": len(activities),
        "last_updated": datetime.now().isoformat()
    }


@router.get("/market-microstructure/{instrument}")
async def get_market_microstructure(instrument: str) -> Dict[str, Any]:
    """Get market microstructure data for an instrument"""
    base_price = 75.45 if instrument == "WTI_CRUDE" else 2.85
    spread = 0.02 + random.random() * 0.03
    
    bids = []
    asks = []
    
    for i in range(10):
        bids.append({
            "price": base_price - spread/2 - i * 0.01,
            "volume": random.randint(500, 5000),
            "orders": random.randint(1, 10)
        })
        asks.append({
            "price": base_price + spread/2 + i * 0.01, 
            "volume": random.randint(500, 5000),
            "orders": random.randint(1, 10)
        })
    
    return {
        "instrument": instrument,
        "timestamp": datetime.now().isoformat(),
        "bids": sorted(bids, key=lambda x: x["price"], reverse=True),
        "asks": sorted(asks, key=lambda x: x["price"]),
        "spread": spread,
        "mid_price": base_price,
        "liquidity_metrics": {
            "bid_ask_spread": spread,
            "market_depth": 3000,
            "liquidity_score": 0.85
        }
    }

