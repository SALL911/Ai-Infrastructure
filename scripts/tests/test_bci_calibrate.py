"""Unit tests for scripts/bci_calibrate.py."""

from __future__ import annotations

import json
import random
import sys
import tempfile
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import bci_calibrate  # noqa: E402


class SpearmanTests(unittest.TestCase):
    def test_perfect_positive(self):
        xs = [1, 2, 3, 4, 5]
        ys = [10, 20, 30, 40, 50]
        self.assertAlmostEqual(bci_calibrate.spearman(xs, ys), 1.0, places=3)

    def test_perfect_negative(self):
        xs = [1, 2, 3, 4, 5]
        ys = [50, 40, 30, 20, 10]
        self.assertAlmostEqual(bci_calibrate.spearman(xs, ys), -1.0, places=3)

    def test_uncorrelated(self):
        xs = [1, 2, 3, 4, 5]
        ys = [3, 1, 4, 1, 5]
        rho = bci_calibrate.spearman(xs, ys)
        self.assertLess(abs(rho), 0.9)
        self.assertGreater(abs(rho), -0.9)

    def test_constant_returns_zero(self):
        xs = [1, 1, 1, 1]
        ys = [1, 2, 3, 4]
        self.assertEqual(bci_calibrate.spearman(xs, ys), 0.0)

    def test_ties_handled(self):
        xs = [1, 2, 2, 3]
        ys = [10, 20, 20, 30]
        self.assertAlmostEqual(bci_calibrate.spearman(xs, ys), 1.0, places=3)

    def test_length_mismatch(self):
        self.assertEqual(bci_calibrate.spearman([1, 2], [1, 2, 3]), 0.0)


class SimplexGridTests(unittest.TestCase):
    def test_sum_is_one(self):
        grid = bci_calibrate.simplex_grid(0.1, 0.1)
        for w in grid:
            self.assertAlmostEqual(sum(w), 1.0, places=6)

    def test_all_above_min(self):
        min_w = 0.15
        grid = bci_calibrate.simplex_grid(0.05, min_w)
        for w in grid:
            for v in w:
                self.assertGreaterEqual(v, min_w - 1e-9)

    def test_count_matches_formula(self):
        # step=0.1, min=0 → 11 points on each axis; simplex has 66 points
        grid = bci_calibrate.simplex_grid(0.1, 0.0)
        self.assertEqual(len(grid), 66)

    def test_empty_when_min_too_high(self):
        # min_w = 0.5 means we need all three >= 0.5, but sum must be 1 → impossible
        grid = bci_calibrate.simplex_grid(0.05, 0.5)
        self.assertEqual(len(grid), 0)


class FitTests(unittest.TestCase):
    def _synthetic(self, true_w: tuple[float, float, float], n: int = 40, seed: int = 42):
        rng = random.Random(seed)
        brands = []
        for i in range(n):
            f = rng.uniform(20, 95)
            v = rng.uniform(15, 95)
            e = rng.uniform(25, 85)
            noise = rng.gauss(0, 2)
            gt = max(0, min(100, true_w[0] * f + true_w[1] * v + true_w[2] * e + noise))
            brands.append({
                "brand_name": f"b{i}",
                "f_last": round(f, 2),
                "v_last": round(v, 2),
                "e_last": round(e, 2),
                "ground_truth": {"normalized": round(gt, 2)},
            })
        return brands

    def test_recovers_known_weights_roughly(self):
        true_w = (0.5, 0.3, 0.2)
        brands = self._synthetic(true_w, n=40)
        grid = bci_calibrate.simplex_grid(0.05, 0.1)
        results = bci_calibrate.fit(brands, grid)
        best_rho, best_w = results[0]
        # With 40 brands + little noise, best Spearman should be very high
        self.assertGreater(best_rho, 0.90)
        # Recovered weights should be within 0.15 of each axis
        for estimated, true_val in zip(best_w, true_w):
            self.assertLess(abs(estimated - true_val), 0.15)

    def test_uncorrelated_yields_low_rho(self):
        rng = random.Random(1)
        brands = [{
            "f_last": rng.uniform(20, 95),
            "v_last": rng.uniform(20, 95),
            "e_last": rng.uniform(20, 95),
            "ground_truth": {"normalized": rng.uniform(20, 95)},
        } for _ in range(30)]
        grid = bci_calibrate.simplex_grid(0.05, 0.1)
        results = bci_calibrate.fit(brands, grid)
        self.assertLess(results[0][0], 0.5)


class CliGateTests(unittest.TestCase):
    def test_noise_triggers_gate_exit_3(self):
        rng = random.Random(1)
        brands = [{
            "brand_name": f"b{i}",
            "f_last": rng.uniform(20, 95),
            "v_last": rng.uniform(20, 95),
            "e_last": rng.uniform(20, 95),
            "ground_truth": {"normalized": rng.uniform(20, 95)},
        } for i in range(30)]
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump({"industry": "noise", "brands": brands}, tf)
            path = tf.name

        code = bci_calibrate.main([
            "--fixtures", path,
            "--grid-step", "0.05",
            "--min-weight", "0.10",
            "--top", "1",
        ])
        self.assertEqual(code, 3)

    def test_good_fit_exits_0_and_writes_output(self):
        rng = random.Random(42)
        true_w = (0.4, 0.4, 0.2)
        brands = []
        for i in range(40):
            f, v, e = rng.uniform(20, 95), rng.uniform(20, 95), rng.uniform(20, 95)
            gt = max(0, min(100, true_w[0] * f + true_w[1] * v + true_w[2] * e + rng.gauss(0, 1.5)))
            brands.append({
                "brand_name": f"b{i}",
                "f_last": round(f, 2),
                "v_last": round(v, 2),
                "e_last": round(e, 2),
                "ground_truth": {"normalized": round(gt, 2)},
            })

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump({"industry": "technology", "brands": brands}, tf)
            fixture = tf.name
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            output = tf.name

        code = bci_calibrate.main([
            "--fixtures", fixture,
            "--grid-step", "0.05",
            "--min-weight", "0.10",
            "--industry", "technology",
            "--output", output,
            "--version", "v_test",
        ])
        self.assertEqual(code, 0)

        payload = json.loads(Path(output).read_text())
        self.assertIn("technology", payload)
        self.assertAlmostEqual(
            payload["technology"]["wF"]
            + payload["technology"]["wV"]
            + payload["technology"]["wE"],
            1.0,
            places=2,
        )


if __name__ == "__main__":
    unittest.main()
