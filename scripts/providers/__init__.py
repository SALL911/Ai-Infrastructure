"""Market data providers for the BCI F-axis (Financial Capital).

Abstract contract in `base.py`; concrete adapters swap out via env
`BCI_MARKET_PROVIDER` (default: yfinance).

See docs/BCI_METHODOLOGY.md §五 for the integration rules, especially the
Bloomberg redistribution constraint.
"""

from .base import MarketDataProvider, MarketSnapshot, load_provider

__all__ = ["MarketDataProvider", "MarketSnapshot", "load_provider"]
