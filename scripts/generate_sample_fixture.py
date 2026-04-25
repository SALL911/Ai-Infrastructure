"""
Generate a synthetic BCI calibration fixture for testing scripts/bci_calibrate.py
without needing real InterBrand / Kantar CSV data.

Produces 50 brands across 6 industries with:
  - Realistic F / V / E score distributions per industry
  - Ground truth derived from a known true weight vector + small noise
  - When you run bci_calibrate against this fixture, it should recover
    weights close to:
      technology:    wF=0.35  wV=0.45  wE=0.20
      consumer_goods: wF=0.25 wV=0.45  wE=0.30
      finance:       wF=0.55  wV=0.20  wE=0.25
      ...

This is for VALIDATING THE CALIBRATOR — not for training real production
weights. Real weights need real ground truth (InterBrand BSS / market cap
forward returns / etc.), see private/bci/CALIBRATION.md.

Usage:
    python scripts/generate_sample_fixture.py
        # writes private/bci/fixtures_sample.json (gitignored)

    python scripts/bci_calibrate.py \
        --fixtures private/bci/fixtures_sample.json \
        --industry technology \
        --output /tmp/recovered_weights.json
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# True weight vectors (what the calibrator should recover within ±0.10)
TRUE_WEIGHTS: dict[str, dict[str, float]] = {
    "technology":            {"wF": 0.35, "wV": 0.45, "wE": 0.20},
    "consumer_goods":        {"wF": 0.25, "wV": 0.45, "wE": 0.30},
    "finance":               {"wF": 0.55, "wV": 0.20, "wE": 0.25},
    "professional_services": {"wF": 0.40, "wV": 0.30, "wE": 0.30},
    "manufacturing":         {"wF": 0.45, "wV": 0.20, "wE": 0.35},
    "default":               {"wF": 0.34, "wV": 0.33, "wE": 0.33},
}

# Synthetic brand pool per industry — fictional names so no real brand data
BRAND_NAMES: dict[str, list[str]] = {
    "technology": [
        "Aurora", "Bytecraft", "Cipher", "Datum", "EchoLogic", "Fluxnode",
        "Gridhive", "Helios", "Ionic", "Kestrel",
    ],
    "consumer_goods": [
        "BrightLeaf", "Coastline", "Dewdrop", "Evergrain", "FernCo",
        "Glade", "Hearth", "IvyMart", "Kinship", "Larkfield",
    ],
    "finance": [
        "Anchor Capital", "Beacon Bank", "Citadel Trust", "Drift Wealth",
        "Eagle Loans", "Fjord Securities", "Gilt Ledger", "Heron Markets",
    ],
    "professional_services": [
        "Alder Advisory", "Briar Strategy", "Cobalt Consult", "Drift Advisors",
        "Elm Studio", "Fern Advisory", "Glen Group", "Holt Partners",
    ],
    "manufacturing": [
        "Anvil Works", "Bolt Foundry", "Cog Industries", "Drive Mechanics",
        "Edge Forge", "Forge Standard",
    ],
    "default": [
        "Misc Alpha", "Misc Bravo", "Misc Charlie", "Misc Delta",
    ],
}


def gen_brand(industry: str, idx: int, rng: random.Random) -> dict:
    """Generate one brand with F / V / E and ground truth."""
    name = BRAND_NAMES[industry][idx % len(BRAND_NAMES[industry])]
    if idx >= len(BRAND_NAMES[industry]):
        name = f"{name} {idx + 1}"

    # Industry-shaped F / V / E distributions
    if industry == "technology":
        f = rng.uniform(40, 95)
        v = rng.uniform(30, 90)
        e = rng.uniform(40, 80)
    elif industry == "consumer_goods":
        f = rng.uniform(30, 80)
        v = rng.uniform(35, 90)
        e = rng.uniform(45, 85)
    elif industry == "finance":
        f = rng.uniform(55, 95)
        v = rng.uniform(20, 65)
        e = rng.uniform(40, 75)
    elif industry == "professional_services":
        f = rng.uniform(40, 80)
        v = rng.uniform(30, 70)
        e = rng.uniform(40, 80)
    elif industry == "manufacturing":
        f = rng.uniform(50, 90)
        v = rng.uniform(15, 55)
        e = rng.uniform(35, 70)
    else:  # default
        f = rng.uniform(30, 80)
        v = rng.uniform(30, 80)
        e = rng.uniform(30, 80)

    w = TRUE_WEIGHTS[industry]
    truth_raw = w["wF"] * f + w["wV"] * v + w["wE"] * e
    noise = rng.gauss(0, 2.5)
    normalized = max(0, min(100, truth_raw + noise))

    return {
        "brand_name": name,
        "ticker": "",
        "f_last": round(f, 2),
        "v_last": round(v, 2),
        "e_last": round(e, 2),
        "ground_truth": {
            "interbrand_bss": None,
            "kantar_value_usd_b": None,
            "normalized": round(normalized, 2),
        },
    }


def generate_fixture(industry: str, n: int, seed: int) -> dict:
    rng = random.Random(seed)
    if industry not in TRUE_WEIGHTS:
        raise ValueError(f"unknown industry: {industry}")

    brands = [gen_brand(industry, i, rng) for i in range(n)]
    brands.sort(key=lambda b: -b["ground_truth"]["normalized"])

    return {
        "industry": industry,
        "_synthetic": True,
        "_true_weights": TRUE_WEIGHTS[industry],
        "_seed": seed,
        "_note": (
            "Synthetic data for validating bci_calibrate.py. "
            "Calibrator should recover weights within ±0.10 of _true_weights. "
            "DO NOT use for production training — see private/bci/CALIBRATION.md."
        ),
        "collected_at": "synthetic",
        "brands": brands,
    }


def main() -> int:
    out_dir = REPO_ROOT / "private" / "bci"
    out_dir.mkdir(parents=True, exist_ok=True)

    industries = list(TRUE_WEIGHTS.keys())
    written = []

    # One combined fixture per industry — the calibrator runs per-industry.
    for industry in industries:
        n = max(40, len(BRAND_NAMES[industry]) * 2)
        fixture = generate_fixture(industry, n=n, seed=hash(industry) & 0xFFFF)
        path = out_dir / f"fixtures_sample_{industry}.json"
        path.write_text(
            json.dumps(fixture, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        written.append((industry, path, n, TRUE_WEIGHTS[industry]))

    print(f"Wrote {len(written)} synthetic fixtures to {out_dir}/")
    print()
    for ind, path, n, w in written:
        print(f"  {path.name}  ({n} brands, true wF/V/E = {w['wF']}/{w['wV']}/{w['wE']})")

    print()
    print("Try:")
    sample = written[0]
    print(
        f"  python scripts/bci_calibrate.py "
        f"--fixtures {sample[1]} --industry {sample[0]} "
        f"--output /tmp/recovered_{sample[0]}.json"
    )
    print()
    print(
        "Calibrator should recover weights within ±0.10 of the true vector."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
