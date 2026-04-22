"""Yahoo Finance adapter (default, no API key required).

Uses the unofficial v7/v10 quoteSummary endpoints; fine for research / MVP.
If Yahoo rate-limits or changes schema, switch provider via env:
  BCI_MARKET_PROVIDER=alphavantage
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request

from .base import MarketSnapshot

USER_AGENT = "Mozilla/5.0 (compatible; SymcioBCI/1.0)"
QUOTE_URL = (
    "https://query2.finance.yahoo.com/v10/finance/quoteSummary/{ticker}"
    "?modules=summaryDetail,defaultKeyStatistics,financialData"
)


class YFinanceAdapter:
    name = "yfinance"

    def fetch(self, ticker: str) -> MarketSnapshot:
        url = QUOTE_URL.format(ticker=urllib.parse.quote(ticker))
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"[yfinance] fetch failed for {ticker}: {exc}")
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        try:
            result = payload["quoteSummary"]["result"][0]
        except (KeyError, IndexError, TypeError):
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        summary = result.get("summaryDetail", {}) or {}
        stats = result.get("defaultKeyStatistics", {}) or {}
        fin = result.get("financialData", {}) or {}

        return MarketSnapshot(
            ticker=ticker,
            market_cap_usd=_raw(summary.get("marketCap")),
            revenue_growth_yoy=_raw(fin.get("revenueGrowth")),
            operating_margin=_raw(fin.get("operatingMargins")),
            beta=_raw(stats.get("beta") or summary.get("beta")),
            source=self.name,
        )


def _raw(field: object) -> float | None:
    if isinstance(field, dict):
        val = field.get("raw")
        return float(val) if isinstance(val, (int, float)) else None
    if isinstance(field, (int, float)):
        return float(field)
    return None
