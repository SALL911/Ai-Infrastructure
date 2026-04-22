"""Abstract market data provider contract for BCI F-axis.

Adapters must return `MarketSnapshot` with these four fields; bci_engine.py
normalizes them. Schema deliberately aligns with Bloomberg B-PIPE field
semantics (CUR_MKT_CAP, SALES_GROWTH, EBIT_MARGIN, BETA_ADJ_OVERRIDABLE) so
customers who self-provide Bloomberg data can plug in without changes upstream.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class MarketSnapshot:
    ticker: str
    market_cap_usd: float | None       # CUR_MKT_CAP (USD)
    revenue_growth_yoy: float | None   # SALES_GROWTH, fraction (0.15 = +15%)
    operating_margin: float | None     # EBIT_MARGIN, fraction
    beta: float | None                 # BETA_ADJ_OVERRIDABLE
    source: str                        # adapter name, for audit


@runtime_checkable
class MarketDataProvider(Protocol):
    name: str

    def fetch(self, ticker: str) -> MarketSnapshot: ...


def load_provider(name: str | None = None) -> MarketDataProvider:
    """Return the configured provider.

    Priority: explicit arg > BCI_MARKET_PROVIDER env > 'yfinance'.
    """
    choice = (name or os.environ.get("BCI_MARKET_PROVIDER") or "yfinance").lower()

    if choice == "yfinance":
        from .yfinance_adapter import YFinanceAdapter
        return YFinanceAdapter()
    if choice == "alphavantage":
        from .alphavantage_adapter import AlphaVantageAdapter
        return AlphaVantageAdapter()
    if choice == "mops_tw":
        from .mops_tw_adapter import MopsTWAdapter
        return MopsTWAdapter()
    if choice == "bloomberg":
        from .bloomberg_stub import BloombergStub
        return BloombergStub()

    raise ValueError(f"Unknown BCI_MARKET_PROVIDER: {choice}")
