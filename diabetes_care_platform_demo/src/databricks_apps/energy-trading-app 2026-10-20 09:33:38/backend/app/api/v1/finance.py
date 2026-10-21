from fastapi import APIRouter
from typing import List

from app.schemas.finance import PnL
from app.services.mock.loader import get_mock_loader

router = APIRouter(prefix="/finance", tags=["finance"])


@router.get("/pnl", response_model=List[PnL])
async def list_pnl() -> List[PnL]:
    loader = get_mock_loader()
    data = loader.load_json("pnl.json")
    return [PnL(**x) for x in data]

