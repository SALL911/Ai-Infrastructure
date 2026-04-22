"""Alpha Vantage adapter (500 req/day free tier).

Requires ALPHAVANTAGE_API_KEY. Uses OVERVIEW endpoint which returns the four
fields we need in a single call.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request

from .base import MarketSnapshot

OVERVIEW_URL = "https://www.alphavantage.co/query?function=OVERVIEW&symbol={ticker}&apikey={key}"


class AlphaVantageAdapter:
    name = "alphavantage"

    def __init__(self) -> None:
        self.api_key = os.environ.get("ALPHAVANTAGE_API_KEY")

    def fetch(self, ticker: str) -> MarketSnapshot:
        if not self.api_key:
            print("[alphavantage] ALPHAVANTAGE_API_KEY missing; returning empty snapshot")
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        url = OVERVIEW_URL.format(ticker=urllib.parse.quote(ticker), key=self.api_key)
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"[alphavantage] fetch failed for {ticker}: {exc}")
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        if not payload or "Symbol" not in payload:
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        return MarketSnapshot(
            ticker=ticker,
            market_cap_usd=_as_float(payload.get("MarketCapitalization")),
            revenue_growth_yoy=_as_float(payload.get("QuarterlyRevenueGrowthYOY")),
            operating_margin=_as_float(payload.get("OperatingMarginTTM")),
            beta=_as_float(payload.get("Beta")),
            source=self.name,
        )


def _as_float(v: object) -> float | None:
    if v in (None, "", "None", "-"):
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
