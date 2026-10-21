from fastapi import APIRouter
from typing import List

from app.schemas.compliance import ComplianceEvent
from app.services.mock.loader import get_mock_loader

router = APIRouter(prefix="/compliance", tags=["compliance"])


@router.get("/events", response_model=List[ComplianceEvent])
async def list_events() -> List[ComplianceEvent]:
    loader = get_mock_loader()
    data = loader.load_json("compliance_events.json")
    return [ComplianceEvent(**x) for x in data]

