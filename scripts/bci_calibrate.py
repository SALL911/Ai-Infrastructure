"""
BCI Calibration helper — propose (w_F, w_V, w_E) weights from fixture data.
---------------------------------------------------------------------------

Inputs: a fixture JSON (see private/bci/CALIBRATION.md §四 Step 1 for schema)
Outputs: weight proposal JSON + fit-quality metrics printed to stdout

Procedure:
  1. Load fixture brands with f_last / v_last / e_last / normalized (0-100)
  2. Grid-search the 3-simplex with step=s, constrained to each w_* >= min
  3. For each grid point, compute Spearman rank correlation vs ground truth
  4. Report best + top-N alternatives + fit metrics
  5. If --output is given, write the best as a weights_v{N}.json-shaped file
     (initializes sub-coefficients a*/b*/c* to the caller-provided defaults or
     uniform 0.25; final tuning remains manual per CALIBRATION.md §四 Step 3)

Zero dependencies (stdlib only). The math is deliberately transparent so the
reviewer / expert panel can audit the fit without a numpy rabbit hole.

Usage:
  python scripts/bci_calibrate.py \
      --fixtures private/bci/fixtures_v1.json \
      --grid-step 0.05 \
      --min-weight 0.10 \
      --industry technology \
      --output private/bci/weights_v2_proposal.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


# ---------- Spearman rank correlation (stdlib) ----------

def _ranks(xs: list[float]) -> list[float]:
    """Return average-ranks (1-indexed); ties share the mean rank."""
    indexed = sorted(enumerate(xs), key=lambda t: t[1])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(indexed):
        j = i
        while j + 1 < len(indexed) and indexed[j + 1][1] == indexed[i][1]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[indexed[k][0]] = avg
        i = j + 1
    return ranks


def spearman(xs: list[float], ys: list[float]) -> float:
    """Spearman rank correlation ρ ∈ [-1, 1]."""
    if len(xs) != len(ys) or len(xs) < 2:
        return 0.0
    rx = _ranks(xs)
    ry = _ranks(ys)
    n = len(xs)
    mx = sum(rx) / n
    my = sum(ry) / n
    num = sum((rx[i] - mx) * (ry[i] - my) for i in range(n))
    denx = sum((r - mx) ** 2 for r in rx) ** 0.5
    deny = sum((r - my) ** 2 for r in ry) ** 0.5
    if denx == 0 or deny == 0:
        return 0.0
    return num / (denx * deny)


# ---------- 3-simplex grid ----------

def simplex_grid(step: float, min_w: float) -> list[tuple[float, float, float]]:
    """Yield (wF, wV, wE) on a step-grid with sum=1 and each >= min_w."""
    points = []
    # Integer grid for numerical stability
    n = int(round(1.0 / step))
    mi = int(round(min_w / step))
    for i in range(mi, n + 1):
        for j in range(mi, n + 1 - i):
            k = n - i - j
            if k < mi:
                continue
            points.append((i * step, j * step, k * step))
    return points


# ---------- fit ----------

def fit(brands: list[dict], grid: list[tuple[float, float, float]]) -> list[tuple[float, tuple[float, float, float]]]:
    """Return list of (spearman, weights) sorted descending."""
    truth = [b["ground_truth"]["normalized"] for b in brands]
    results = []
    for w in grid:
        pred = [w[0] * b["f_last"] + w[1] * b["v_last"] + w[2] * b["e_last"] for b in brands]
        results.append((spearman(pred, truth), w))
    results.sort(key=lambda t: t[0], reverse=True)
    return results


# ---------- quality metrics ----------

def top_k_overlap(pred_ranks: list[float], truth_ranks: list[float], k: int) -> int:
    """Count how many of the top-k by pred are also top-k by truth."""
    # top_k by pred = indices with highest pred values
    pred_top = set(sorted(range(len(pred_ranks)), key=lambda i: -pred_ranks[i])[:k])
    truth_top = set(sorted(range(len(truth_ranks)), key=lambda i: -truth_ranks[i])[:k])
    return len(pred_top & truth_top)


def report(best: tuple[float, tuple[float, float, float]], brands: list[dict]) -> None:
    rho, w = best
    truth = [b["ground_truth"]["normalized"] for b in brands]
    pred = [w[0] * b["f_last"] + w[1] * b["v_last"] + w[2] * b["e_last"] for b in brands]
    k = min(10, len(brands))
    overlap = top_k_overlap(pred, truth, k)
    stdev = (sum((p - sum(pred) / len(pred)) ** 2 for p in pred) / len(pred)) ** 0.5
    print(f"  best weights: wF={w[0]:.2f}  wV={w[1]:.2f}  wE={w[2]:.2f}")
    print(f"  Spearman ρ:   {rho:.3f}")
    print(f"  Top-{k} overlap: {overlap}/{k}")
    print(f"  Pred σ:       {stdev:.2f}")


# ---------- weight file writer ----------

def write_weights_file(path: Path, industry: str, w: tuple[float, float, float], version: str) -> None:
    payload = {
        "_note": "Calibration proposal from scripts/bci_calibrate.py; review per private/bci/CALIBRATION.md §四 Step 3 before production.",
        "_schema_version": version,
        industry: {
            "wF": round(w[0], 3),
            "wV": round(w[1], 3),
            "wE": round(w[2], 3),
            "a1": 0.25, "a2": 0.25, "a3": 0.25, "a4": 0.25,
            "b1": 0.25, "b2": 0.25, "b3": 0.25, "b4": 0.25,
            "c1": 0.25, "c2": 0.25, "c3": 0.25, "c4": 0.25,
        },
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


# ---------- main ----------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="BCI weight calibration via grid search + Spearman")
    parser.add_argument("--fixtures", required=True, type=Path, help="Path to fixture JSON")
    parser.add_argument("--grid-step", type=float, default=0.05, help="Simplex grid step (default 0.05)")
    parser.add_argument("--min-weight", type=float, default=0.10, help="Minimum per-axis weight (default 0.10)")
    parser.add_argument("--industry", type=str, default=None, help="Override industry key from fixture")
    parser.add_argument("--top", type=int, default=10, help="How many alternative weight sets to show")
    parser.add_argument("--output", type=Path, help="Optional: write proposal to this weights file")
    parser.add_argument("--version", type=str, default="v2_proposal", help="Version tag for output file")
    args = parser.parse_args(argv)

    if not args.fixtures.exists():
        print(f"fixture not found: {args.fixtures}", file=sys.stderr)
        return 1

    data = json.loads(args.fixtures.read_text(encoding="utf-8"))
    industry = args.industry or data.get("industry", "default")
    brands = data.get("brands", [])
    if len(brands) < 10:
        print(f"WARNING: only {len(brands)} brands; calibration needs ≥ 30 for reliable fit", file=sys.stderr)

    grid = simplex_grid(args.grid_step, args.min_weight)
    print(f"[calibrate] industry={industry} N={len(brands)} grid_points={len(grid)}")
    print()

    results = fit(brands, grid)
    if not results:
        print("No valid grid points; check --min-weight vs --grid-step", file=sys.stderr)
        return 2

    print("=== Best weights ===")
    report(results[0], brands)
    print()

    top_n = min(args.top, len(results))
    print(f"=== Top {top_n} alternatives ===")
    for rank, (rho, w) in enumerate(results[:top_n], start=1):
        print(f"  #{rank}: ρ={rho:.3f}  wF={w[0]:.2f}  wV={w[1]:.2f}  wE={w[2]:.2f}")

    if args.output:
        write_weights_file(args.output, industry, results[0][1], args.version)
        print(f"\n[calibrate] proposal written to {args.output}")
        print("  Next step: run expert panel review per private/bci/CALIBRATION.md §四 Step 3")

    # Gate: Spearman threshold from CALIBRATION.md §六
    if results[0][0] < 0.60:
        print(f"\n⚠️  Spearman ρ = {results[0][0]:.3f} below holdout threshold (0.60).", file=sys.stderr)
        print("    Do NOT promote to production without revisiting dataset / ground truth.", file=sys.stderr)
        return 3

    return 0


if __name__ == "__main__":
    sys.exit(main())
