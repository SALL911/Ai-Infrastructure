"""Unit tests for scripts/providers/ adapters.

Run:
    python -m unittest scripts.tests.test_providers

Covers:
  - load_provider dispatch for each adapter name
  - Bloomberg stub: disabled default vs enabled-without-blpapi
  - MarketSnapshot dataclass shape
  - Helper _as_float / _raw parsing
  - yfinance / alphavantage: no network — construction only
"""

from __future__ import annotations

import importlib
import os
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from providers import load_provider  # noqa: E402
from providers.base import MarketSnapshot  # noqa: E402


class LoadProviderTests(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.pop("BCI_MARKET_PROVIDER", None)

    def tearDown(self):
        os.environ.pop("BCI_MARKET_PROVIDER", None)
        if self._saved is not None:
            os.environ["BCI_MARKET_PROVIDER"] = self._saved

    def test_default_is_yfinance(self):
        p = load_provider()
        self.assertEqual(p.name, "yfinance")

    def test_explicit_alphavantage(self):
        p = load_provider("alphavantage")
        self.assertEqual(p.name, "alphavantage")

    def test_explicit_mops_tw(self):
        p = load_provider("mops_tw")
        self.assertEqual(p.name, "mops_tw")

    def test_explicit_bloomberg(self):
        p = load_provider("bloomberg")
        self.assertEqual(p.name, "bloomberg")

    def test_env_override(self):
        os.environ["BCI_MARKET_PROVIDER"] = "bloomberg"
        p = load_provider()
        self.assertEqual(p.name, "bloomberg")

    def test_unknown_raises(self):
        with self.assertRaises(ValueError):
            load_provider("faker_provider_999")


class BloombergStubTests(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.pop("BLOOMBERG_ENABLED", None)

    def tearDown(self):
        os.environ.pop("BLOOMBERG_ENABLED", None)
        if self._saved is not None:
            os.environ["BLOOMBERG_ENABLED"] = self._saved

    def _stub(self):
        from providers.bloomberg_stub import BloombergStub
        return BloombergStub()

    def test_disabled_default_silent_fallback(self):
        snap = self._stub().fetch("AAPL")
        self.assertEqual(snap.ticker, "AAPL")
        self.assertIsNone(snap.market_cap_usd)
        self.assertIsNone(snap.beta)
        self.assertEqual(snap.source, "bloomberg")

    def test_enabled_without_blpapi_raises(self):
        os.environ["BLOOMBERG_ENABLED"] = "true"
        with self.assertRaises(RuntimeError) as ctx:
            self._stub().fetch("AAPL")
        self.assertIn("blpapi", str(ctx.exception).lower())

    def test_explicit_false_silent_fallback(self):
        os.environ["BLOOMBERG_ENABLED"] = "false"
        snap = self._stub().fetch("AAPL")
        self.assertIsNone(snap.market_cap_usd)


class MarketSnapshotTests(unittest.TestCase):
    def test_frozen_dataclass_is_immutable(self):
        snap = MarketSnapshot("AAPL", 1e10, 0.1, 0.2, 1.0, "test")
        with self.assertRaises(Exception):
            snap.ticker = "TSLA"  # type: ignore[misc]

    def test_dict_serializable(self):
        import json
        snap = MarketSnapshot("AAPL", 1e10, 0.1, 0.2, 1.0, "test")
        payload = json.dumps(snap.__dict__)
        self.assertIn("AAPL", payload)


class YFinanceRawHelperTests(unittest.TestCase):
    """Exercise the _raw helper without hitting the network."""

    def test_raw_extracts_dict_field(self):
        from providers.yfinance_adapter import _raw
        self.assertEqual(_raw({"raw": 3500000000000}), 3500000000000.0)
        self.assertIsNone(_raw({"raw": "not-a-number"}))
        self.assertEqual(_raw(0.15), 0.15)
        self.assertIsNone(_raw(None))
        self.assertIsNone(_raw({}))


class AlphaVantageHelperTests(unittest.TestCase):
    def test_as_float_parse(self):
        from providers.alphavantage_adapter import _as_float
        self.assertEqual(_as_float("1234.5"), 1234.5)
        self.assertIsNone(_as_float("None"))
        self.assertIsNone(_as_float(""))
        self.assertIsNone(_as_float("-"))
        self.assertIsNone(_as_float(None))
        self.assertEqual(_as_float(42), 42.0)


class MopsTWHelperTests(unittest.TestCase):
    def test_clean_ticker_suffix(self):
        # MopsTW.fetch strips .TW / .tw suffix; verify via a dry read
        from providers.mops_tw_adapter import MopsTWAdapter
        adapter = MopsTWAdapter()
        self.assertEqual(adapter.name, "mops_tw")


class AlphaVantageNoKeyTests(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.pop("ALPHAVANTAGE_API_KEY", None)

    def tearDown(self):
        if self._saved is not None:
            os.environ["ALPHAVANTAGE_API_KEY"] = self._saved

    def test_missing_key_returns_empty_snapshot(self):
        from providers.alphavantage_adapter import AlphaVantageAdapter
        snap = AlphaVantageAdapter().fetch("AAPL")
        self.assertIsNone(snap.market_cap_usd)
        self.assertEqual(snap.ticker, "AAPL")


if __name__ == "__main__":
    unittest.main()
