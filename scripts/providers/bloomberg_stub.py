"""Bloomberg adapter stub — customer-provided Terminal license required.

======================================================================
LEGAL / COMPLIANCE NOTE — READ BEFORE ENABLING
======================================================================
Symcio does NOT proxy, resell, or redistribute Bloomberg data.

This module is intentionally a stub. It ships the interface contract only
(field names aligned with Bloomberg B-PIPE semantics) so that an enterprise
customer who self-owns a Bloomberg Terminal subscription can wire their own
blpapi integration and plug in without touching bci_engine.py.

Activation requirements (ALL must be true):
  1. Customer possesses a valid Bloomberg Terminal subscription.
  2. Customer self-hosts the blpapi runtime and Desktop API (DAPI) connection.
  3. Customer accepts Bloomberg DEALM / DAPI redistribution constraints.
  4. BLOOMBERG_ENABLED=true is set in the customer's own environment
     (NEVER set in Symcio's shared Vercel / GitHub secrets).

If any of the above is not met, this adapter raises RuntimeError and
bci_engine.py will fall back to yfinance.

References:
  https://www.bloomberg.com/professional/solution/b-pipe/
  https://www.bloomberg.com/professional/support/desktop-api/

Field mapping (B-PIPE -> MarketSnapshot):
  CUR_MKT_CAP             -> market_cap_usd
  SALES_GROWTH            -> revenue_growth_yoy
  EBIT_MARGIN             -> operating_margin
  BETA_ADJ_OVERRIDABLE    -> beta
"""

from __future__ import annotations

import os

from .base import MarketSnapshot


class BloombergStub:
    name = "bloomberg"

    def fetch(self, ticker: str) -> MarketSnapshot:
        enabled = os.environ.get("BLOOMBERG_ENABLED", "").lower() == "true"
        if not enabled:
            # Silent fallback — caller (bci_engine) should pick another adapter.
            # Do NOT raise; missing Bloomberg is the default expected state.
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        # Customer enabled Bloomberg but didn't install the integration layer.
        # Raise loudly so misconfiguration is visible in CI logs.
        raise RuntimeError(
            "Bloomberg adapter enabled (BLOOMBERG_ENABLED=true) but no blpapi "
            "integration installed. Symcio does not ship blpapi. Customer must "
            "self-install per Bloomberg DAPI license, then replace this stub "
            "with a real blpapi implementation."
        )
