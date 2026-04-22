"""
Collect BCI calibration fixtures from public ranking CSV exports.
-----------------------------------------------------------------

Reads multiple CSV files (one per source: InterBrand / Kantar / Forbes /
自有 LTV), normalizes each source's `value` column to 0-100 within the
target industry, merges on `brand_name` (case-insensitive), and emits a
fixture JSON ready for scripts/bci_calibrate.py.

IMPORTANT — legal boundary:
  This script does NOT scrape InterBrand / Kantar / Forbes websites. Their
  ranking data is copyrighted; the terms-of-service on those sites prohibit
  automated extraction. You (the operator) must:
    1. Manually export the relevant year's ranking to CSV
    2. Keep those CSV files in `private/bci/inputs/` (gitignored)
    3. Pass them to this script via --source arguments

The ground-truth computed here is for your own internal calibration only
and is never re-exported or repackaged as a dataset.

CSV input schema (flexible — script auto-detects by column name, case-
insensitive):
  brand_name      required
  ticker          optional
  value           required (numeric: brand value USD, score, or any rank proxy)
  rank            optional (integer rank within the source)
  industry        optional (filter will apply if --industry given)

Usage:
  python scripts/collect_fixtures.py \
      --source interbrand=private/bci/inputs/interbrand_2025.csv \
      --source kantar=private/bci/inputs/brandz_2025.csv \
      --industry technology \
      --output private/bci/fixtures_v1.json

After running:
  - merged file contains brands present in >=2 sources (higher confidence)
  - normalized[0..100] = mean of per-source z-score, rescaled
  - brands present in only 1 source go to the 'low_confidence' list
    (not written to main fixture; reviewed manually)
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


# ---------- schema detection ----------

FIELD_ALIASES = {
    "brand_name": ["brand_name", "brand", "company", "name", "品牌", "品牌名稱"],
    "ticker": ["ticker", "symbol", "stock"],
    "value": ["value", "brand_value", "score", "brand_score", "bss", "value_usd_b", "value_usd", "brand_value_m"],
    "rank": ["rank", "ranking", "position", "排名"],
    "industry": ["industry", "sector", "category", "產業"],
}


def _find_col(header: list[str], key: str) -> str | None:
    lower = {h.lower().strip(): h for h in header}
    for alias in FIELD_ALIASES[key]:
        if alias in lower:
            return lower[alias]
    return None


def _clean_value(raw: str) -> float | None:
    if raw is None:
        return None
    s = str(raw).strip().replace(",", "").replace("$", "").replace(" ", "")
    if not s or s.lower() in ("n/a", "na", "-", "none"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


# ---------- per-source load ----------

def load_source(label: str, path: Path, industry_filter: str | None) -> list[dict]:
    if not path.exists():
        print(f"[collect] source {label}: {path} not found, skipping", file=sys.stderr)
        return []

    rows: list[dict] = []
    with path.open("r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []
        col_name = _find_col(header, "brand_name")
        col_value = _find_col(header, "value")
        col_ticker = _find_col(header, "ticker")
        col_rank = _find_col(header, "rank")
        col_industry = _find_col(header, "industry")

        if not col_name or not col_value:
            print(f"[collect] {label}: missing required columns (brand_name / value). Header={header}", file=sys.stderr)
            return []

        for r in reader:
            name = (r.get(col_name) or "").strip()
            if not name:
                continue
            if industry_filter and col_industry:
                ind = (r.get(col_industry) or "").strip().lower()
                if industry_filter.lower() not in ind:
                    continue
            val = _clean_value(r.get(col_value))
            if val is None:
                continue
            rows.append({
                "source": label,
                "brand_name": name,
                "brand_key": _normalize_brand(name),
                "ticker": (r.get(col_ticker) or "").strip() if col_ticker else "",
                "value": val,
                "rank": int(_clean_value(r.get(col_rank)) or 0) if col_rank else None,
                "industry": (r.get(col_industry) or "").strip().lower() if col_industry else None,
            })
    print(f"[collect] {label}: loaded {len(rows)} brands from {path}")
    return rows


def _normalize_brand(name: str) -> str:
    """Aggressive key for fuzzy matching across sources."""
    s = re.sub(r"[^a-zA-Z0-9一-鿿]", "", name).lower()
    # strip common corp suffixes
    for suffix in ("inc", "corp", "corporation", "ltd", "llc", "company", "co", "group", "holdings"):
        if s.endswith(suffix):
            s = s[: -len(suffix)]
    return s


# ---------- normalize per-source values to 0-100 ----------

def normalize_to_0_100(rows: list[dict]) -> list[dict]:
    """Min-max per source label."""
    by_source: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_source[r["source"]].append(r)

    for source, group in by_source.items():
        vals = [r["value"] for r in group]
        lo, hi = min(vals), max(vals)
        span = (hi - lo) or 1.0
        for r in group:
            r["value_norm"] = round((r["value"] - lo) / span * 100, 2)
    return rows


# ---------- merge on brand_key ----------

def merge(rows: list[dict], min_sources: int = 2) -> tuple[list[dict], list[dict]]:
    """Return (merged, low_confidence). Merged has brands in >=min_sources."""
    by_key: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_key[r["brand_key"]].append(r)

    merged = []
    low_conf = []
    for key, group in by_key.items():
        # dedupe within the same source (keep highest value)
        per_source: dict[str, dict] = {}
        for g in group:
            current = per_source.get(g["source"])
            if not current or g["value"] > current["value"]:
                per_source[g["source"]] = g

        sources = list(per_source.keys())
        display_name = max((g["brand_name"] for g in group), key=len)
        ticker = next((g["ticker"] for g in group if g.get("ticker")), "")

        # Ground truth = mean of per-source value_norm
        norm_scores = [g["value_norm"] for g in per_source.values()]
        ground_truth = round(sum(norm_scores) / len(norm_scores), 2)

        record = {
            "brand_name": display_name,
            "ticker": ticker,
            "sources": sources,
            "source_values": {s: g["value_norm"] for s, g in per_source.items()},
            "source_ranks": {s: g["rank"] for s, g in per_source.items() if g.get("rank")},
            "ground_truth": {
                "normalized": ground_truth,
                "n_sources": len(sources),
            },
            # f_last / v_last / e_last are filled later by bci_engine.py or manual entry
            "f_last": None,
            "v_last": None,
            "e_last": None,
        }

        if len(sources) >= min_sources:
            merged.append(record)
        else:
            low_conf.append(record)

    merged.sort(key=lambda r: -r["ground_truth"]["normalized"])
    low_conf.sort(key=lambda r: -r["ground_truth"]["normalized"])
    return merged, low_conf


# ---------- main ----------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Merge public brand-ranking CSVs into a BCI calibration fixture")
    parser.add_argument(
        "--source",
        action="append",
        required=True,
        help="Source spec as label=path, e.g. interbrand=private/bci/inputs/ib_2025.csv. Repeat for multiple sources.",
    )
    parser.add_argument("--industry", type=str, default=None, help="Optional industry filter (case-insensitive substring)")
    parser.add_argument("--min-sources", type=int, default=2, help="Min sources required for merged fixture (default 2)")
    parser.add_argument("--output", type=Path, required=True, help="Output fixture JSON path")
    parser.add_argument("--low-confidence-output", type=Path, help="Optional: write 1-source brands here for manual review")
    args = parser.parse_args(argv)

    all_rows: list[dict] = []
    for spec in args.source:
        if "=" not in spec:
            print(f"--source must be label=path, got: {spec}", file=sys.stderr)
            return 1
        label, path_str = spec.split("=", 1)
        all_rows.extend(load_source(label.strip(), Path(path_str.strip()), args.industry))

    if not all_rows:
        print("No rows loaded from any source.", file=sys.stderr)
        return 2

    all_rows = normalize_to_0_100(all_rows)
    merged, low_conf = merge(all_rows, min_sources=args.min_sources)

    print(f"[collect] merged brands (>={args.min_sources} sources): {len(merged)}")
    print(f"[collect] low-confidence (1 source only):              {len(low_conf)}")

    out = {
        "industry": args.industry or "default",
        "collected_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "sources": sorted({r["source"] for r in all_rows}),
        "brands": merged,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[collect] wrote fixture: {args.output}")

    if args.low_confidence_output and low_conf:
        args.low_confidence_output.parent.mkdir(parents=True, exist_ok=True)
        args.low_confidence_output.write_text(
            json.dumps({"industry": args.industry or "default", "brands": low_conf}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"[collect] wrote low-confidence pool: {args.low_confidence_output}")

    # Next step
    print()
    print("Next step:")
    print("  1. Fill in f_last / v_last / e_last for each brand (run bci_engine.py with DRY_RUN=true or manual)")
    print(f"  2. python scripts/bci_calibrate.py --fixtures {args.output} --industry {out['industry']} --output {args.output.parent}/weights_v1_proposal.json")

    return 0


if __name__ == "__main__":
    sys.exit(main())
