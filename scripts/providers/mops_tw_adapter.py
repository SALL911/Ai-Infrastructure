"""MOPS TW adapter — 公開資訊觀測站（台股）.

此 adapter 只抓「公開 summary 數據」，用於 BCI F-axis 的台股 coverage。
所有欄位皆為公開資料（MOPS 為金管會公開揭露平台），無授權問題。

目前為最小 stub：只取市值（via TWSE 盤後），其他欄位留 None。真正接通
財報資料需要解 MOPS 的 t187ap03_L（綜合損益表）與 t187ap06_L（資產負債表），
issue tracked separately.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request

from .base import MarketSnapshot

TWSE_QUOTE_URL = "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_{ticker}.tw"


class MopsTWAdapter:
    name = "mops_tw"

    def fetch(self, ticker: str) -> MarketSnapshot:
        # ticker expected like "2330" (台積電); adapter adds .tw suffix
        clean = ticker.replace(".TW", "").replace(".tw", "")
        url = TWSE_QUOTE_URL.format(ticker=urllib.parse.quote(clean))
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"[mops_tw] fetch failed for {ticker}: {exc}")
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        rows = payload.get("msgArray") or []
        if not rows:
            return MarketSnapshot(ticker, None, None, None, None, self.name)

        row = rows[0]
        last_price = _as_float(row.get("z") or row.get("y"))
        # TWSE 盤後 "o" 開盤、"y" 昨收；市值需乘以在外流通股數（本 stub 未抓）
        return MarketSnapshot(
            ticker=ticker,
            market_cap_usd=None,          # TODO: 抓 MOPS t164sb01 在外流通股數
            revenue_growth_yoy=None,      # TODO: 解 t187ap03_L
            operating_margin=None,        # TODO: 解 t187ap03_L
            beta=None,                    # TWSE 不提供 beta；可用 TEJ 或自算
            source=f"{self.name}(last_price={last_price})",
        )


def _as_float(v: object) -> float | None:
    if v in (None, "", "-"):
        return None
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
