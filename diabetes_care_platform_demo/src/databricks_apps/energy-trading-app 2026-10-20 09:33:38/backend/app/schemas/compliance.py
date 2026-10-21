from pydantic import BaseModel
from typing import Literal


class ComplianceEvent(BaseModel):
    event_id: str
    timestamp: str  # ISO datetime
    severity: Literal["low", "medium", "high"]
    category: str  # e.g., policy, kyc, trade_surveillance
    message: str
    status: Literal["open", "investigating", "closed"]

