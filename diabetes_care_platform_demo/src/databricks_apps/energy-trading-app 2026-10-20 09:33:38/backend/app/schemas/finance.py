from pydantic import BaseModel


class PnL(BaseModel):
    date: str
    product: str
    pnl: float

