import json
from datetime import date, timedelta, datetime
import random
import os

BASE_DIR = os.path.dirname(__file__)

random.seed(42)

products = ["WTI", "Brent", "Gas", "Power"]
counterparties = ["ABC Bank", "EnergyCo", "GlobalCommod", "HedgeFundX"]


def daterange(start: date, end: date):
    cur = start
    while cur <= end:
        yield cur
        cur += timedelta(days=1)


def gen_trades(n: int = 2000, max_days_back: int = 365 * 3):
    out = []
    now = datetime.utcnow()
    for i in range(n):
        side = random.choice(["BUY", "SELL"])
        qty = round(random.uniform(10, 1000), 2)
        price = round(random.uniform(20, 120), 2)
        d = date.today() - timedelta(days=random.randint(0, max_days_back))
        ts = now - timedelta(hours=random.randint(0, 24 * max_days_back), minutes=random.randint(0, 59))
        out.append({
            "trade_id": f"T{i:06d}",
            "instrument": random.choice(products),
            "counterparty": random.choice(counterparties),
            "side": side,
            "quantity": qty,
            "price": price,
            "currency": "USD",
            "trade_date": d.isoformat(),
            "settle_date": (d + timedelta(days=2)).isoformat(),
            "timestamp": ts.isoformat() + "Z"
        })
    return out


def gen_positions(days: int = 365 * 10):
    start = date.today() - timedelta(days=days)
    out = []
    for d in daterange(start, date.today()):
        for p in products:
            base = random.uniform(-3000, 3000)
            drift = random.uniform(-100, 100)
            quantity = round(base + drift, 2)
            out.append({
                "date": d.isoformat(),
                "product": p,
                "quantity": quantity
            })
    return out


def gen_var(days: int = 365 * 10):
    start = date.today() - timedelta(days=days)
    out = []
    for d in daterange(start, date.today()):
        for p in products:
            base = random.uniform(20000, 220000)
            season = 1 + 0.2 * (1 if d.month in [1,2,12] else -0.2 if d.month in [6,7,8] else 0)
            v = base * season
            out.append({
                "date": d.isoformat(),
                "product": p,
                "var_95": round(v * 0.95, 2),
                "var_99": round(v * 0.99, 2)
            })
    return out


def gen_pnl(days: int = 365 * 10):
    start = date.today() - timedelta(days=days)
    out = []
    for d in daterange(start, date.today()):
        for p in products:
            season = 1 if d.month in [1,2,12] else -1 if d.month in [6,7,8] else 0
            val = random.uniform(-150000, 150000) + season * random.uniform(0, 50000)
            out.append({
                "date": d.isoformat(),
                "product": p,
                "pnl": round(val, 2)
            })
    return out


def gen_compliance_events(n: int = 400):
    severities = ["low", "medium", "high"]
    cats = ["policy", "kyc", "trade_surveillance", "limits"]
    statuses = ["open", "investigating", "closed"]
    out = []
    for i in range(n):
        ts = datetime.utcnow() - timedelta(hours=random.randint(0, 24 * 180))
        out.append({
            "event_id": f"C{i:06d}",
            "timestamp": ts.isoformat() + "Z",
            "severity": random.choices(severities, weights=[0.6, 0.3, 0.1])[0],
            "category": random.choice(cats),
            "message": random.choice([
                "Trade threshold exceeded",
                "Missing KYC document",
                "Policy exception detected",
                "Order outside risk limits"
            ]),
            "status": random.choices(statuses, weights=[0.3, 0.4, 0.3])[0]
        })
    return out


def write_json(name: str, data):
    path = os.path.join(BASE_DIR, f"{name}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Wrote {path}")


if __name__ == "__main__":
    write_json("trades", gen_trades())
    write_json("positions", gen_positions())
    write_json("var_results", gen_var())
    write_json("pnl", gen_pnl())
    write_json("compliance_events", gen_compliance_events())
