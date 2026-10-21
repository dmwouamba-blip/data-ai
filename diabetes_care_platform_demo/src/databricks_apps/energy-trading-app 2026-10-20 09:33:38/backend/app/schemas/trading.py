from pydantic import BaseModel
from typing import Optional


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
