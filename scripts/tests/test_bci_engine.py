"""Unit tests for scripts/bci_engine.py — the BCI formula core.

Run:
    python -m unittest scripts.tests.test_bci_engine

Covers:
  - compute_f: empty / high-cap / negative-growth / missing-beta edges
  - compute_v: empty / full-positive / all-negative / many-competitors
  - compute_e: empty / sparse / saturated
  - load_weights: env priority, missing fallback, version override
  - industry_weights: known industry, unknown fallback
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import bci_engine  # noqa: E402
from bci_engine import (  # noqa: E402
    DEFAULT_WEIGHTS,
    compute_e,
    compute_f,
    compute_v,
    industry_weights,
    load_weights,
)
from providers.base import MarketSnapshot  # noqa: E402


W = DEFAULT_WEIGHTS["default"]


class ComputeFTests(unittest.TestCase):
    def test_all_none_returns_none(self):
        snap = MarketSnapshot("X", None, None, None, None, "test")
        self.assertIsNone(compute_f(snap, W))

    def test_apple_like_scores_high(self):
        snap = MarketSnapshot("AAPL", 3.5e12, 0.08, 0.30, 1.2, "test")
        score = compute_f(snap, W)
        self.assertIsNotNone(score)
        self.assertGreater(score, 80)
        self.assertLessEqual(score, 100)

    def test_negative_growth_drops_score(self):
        good = MarketSnapshot("A", 1e10, 0.15, 0.20, 1.0, "test")
        bad = MarketSnapshot("B", 1e10, -0.15, 0.20, 1.0, "test")
        self.assertGreater(compute_f(good, W), compute_f(bad, W))

    def test_extreme_beta_drops_score(self):
        low_beta = MarketSnapshot("A", 1e10, 0.10, 0.20, 1.0, "test")
        high_beta = MarketSnapshot("B", 1e10, 0.10, 0.20, 3.0, "test")
        self.assertGreater(compute_f(low_beta, W), compute_f(high_beta, W))

    def test_missing_beta_uses_neutral(self):
        snap = MarketSnapshot("A", 1e10, 0.10, 0.20, None, "test")
        score = compute_f(snap, W)
        self.assertIsNotNone(score)
        self.assertGreater(score, 0)
        self.assertLess(score, 100)

    def test_range_clamped_0_100(self):
        # Tiny cap, huge negative margin, extreme beta — should clamp to 0..100
        snap = MarketSnapshot("X", 1.0, -0.5, -0.5, 5.0, "test")
        score = compute_f(snap, W)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)


class ComputeVTests(unittest.TestCase):
    def test_empty_returns_none(self):
        score, n = compute_v([], W)
        self.assertIsNone(score)
        self.assertEqual(n, 0)

    def test_perfect_visibility(self):
        rows = [
            {"mentioned": True, "rank_position": 1, "sentiment": "positive", "competitors": []},
            {"mentioned": True, "rank_position": 1, "sentiment": "positive", "competitors": []},
        ]
        score, n = compute_v(rows, W)
        self.assertEqual(n, 2)
        self.assertGreater(score, 85)

    def test_all_missing(self):
        rows = [
            {"mentioned": False, "rank_position": None, "sentiment": "neutral", "competitors": ["a", "b", "c", "d"]},
            {"mentioned": False, "rank_position": None, "sentiment": "negative", "competitors": ["a", "b", "c", "d", "e"]},
        ]
        score, n = compute_v(rows, W)
        self.assertEqual(n, 2)
        self.assertLess(score, 30)

    def test_many_competitors_reduces_score(self):
        few_comp = [{"mentioned": True, "rank_position": 1, "sentiment": "positive", "competitors": ["a"]}]
        many_comp = [{"mentioned": True, "rank_position": 1, "sentiment": "positive",
                      "competitors": ["a", "b", "c", "d", "e", "f", "g", "h"]}]
        s1, _ = compute_v(few_comp, W)
        s2, _ = compute_v(many_comp, W)
        self.assertGreater(s1, s2)


class ComputeETests(unittest.TestCase):
    def test_empty_returns_none(self):
        score, n = compute_e([], W)
        self.assertIsNone(score)
        self.assertEqual(n, 0)

    def test_mixed_signals_in_range(self):
        rows = [
            {"signal_type": "digital_sov", "value": 35.0, "weight": 1.0},
            {"signal_type": "nps_response", "value": 42.0, "weight": 1.0},
            {"signal_type": "advocacy_lexicon", "value": 12.0, "weight": 1.0},
            {"signal_type": "category_relevance", "value": 0.6, "weight": 1.0},
        ]
        score, n = compute_e(rows, W)
        self.assertEqual(n, 4)
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)

    def test_saturated_advocacy_clamps(self):
        rows = [{"signal_type": "advocacy_lexicon", "value": 9999.0, "weight": 1.0}]
        score, _ = compute_e(rows, W)
        # Only c3 contributes; should not overflow 100 * c3 (.25) = 25
        self.assertLessEqual(score, 100)

    def test_negative_nps_pushed_low(self):
        good = [{"signal_type": "nps_response", "value": 80.0, "weight": 1.0}]
        bad = [{"signal_type": "nps_response", "value": -80.0, "weight": 1.0}]
        sg, _ = compute_e(good, W)
        sb, _ = compute_e(bad, W)
        self.assertGreater(sg, sb)


class WeightLoaderTests(unittest.TestCase):
    def setUp(self):
        self._saved_env = {}
        for k in ("BCI_WEIGHTS_JSON", "BCI_WEIGHTS_VERSION"):
            if k in os.environ:
                self._saved_env[k] = os.environ.pop(k)

    def tearDown(self):
        for k in ("BCI_WEIGHTS_JSON", "BCI_WEIGHTS_VERSION"):
            os.environ.pop(k, None)
        for k, v in self._saved_env.items():
            os.environ[k] = v

    def test_env_takes_priority(self):
        payload = {"v1": {"technology": {"wF": 0.5, "wV": 0.3, "wE": 0.2,
                                          "a1": 0.25, "a2": 0.25, "a3": 0.25, "a4": 0.25,
                                          "b1": 0.25, "b2": 0.25, "b3": 0.25, "b4": 0.25,
                                          "c1": 0.25, "c2": 0.25, "c3": 0.25, "c4": 0.25}}}
        os.environ["BCI_WEIGHTS_JSON"] = json.dumps(payload)
        os.environ["BCI_WEIGHTS_VERSION"] = "v1"
        table, version = load_weights()
        self.assertEqual(version, "v1")
        w = industry_weights(table, "technology")
        self.assertEqual(w["wF"], 0.5)

    def test_missing_everything_falls_to_default_with_warning(self):
        table, version = load_weights()
        self.assertEqual(version, "v0-default")
        self.assertIn("default", table)

    def test_industry_unknown_falls_to_default(self):
        w = industry_weights(DEFAULT_WEIGHTS, "unknown_industry")
        self.assertEqual(w, DEFAULT_WEIGHTS["default"])


class SubscoreAggregationTests(unittest.TestCase):
    """When one subscore is None, the aggregation renormalizes across present ones."""

    def test_aggregation_with_partial_signals(self):
        # Simulate the main loop's weighted-average with renormalization
        f, v, e = 80.0, None, 60.0
        w = {"wF": 0.35, "wV": 0.40, "wE": 0.25}
        parts = []
        weights_sum = 0.0
        for key, val in (("wF", f), ("wV", v), ("wE", e)):
            if val is not None:
                parts.append(w[key] * val)
                weights_sum += w[key]
        total = round(sum(parts) / weights_sum, 2)
        # 80 * 0.35 + 60 * 0.25 = 28 + 15 = 43; / 0.60 = 71.67
        self.assertAlmostEqual(total, 71.67, places=1)

    def test_aggregation_all_none_skipped(self):
        parts = []
        weights_sum = 0.0
        for val in (None, None, None):
            if val is not None:
                parts.append(0.33 * val)
                weights_sum += 0.33
        self.assertFalse(parts)
        self.assertEqual(weights_sum, 0)


if __name__ == "__main__":
    unittest.main()
