#!/usr/bin/env python3
"""
通用 NotebookLM 同步器（URL + 本機檔案）。

WHY
    `notebooklm_research.py` 是 YouTube 專用（走 yt-dlp）。Symcio 的知識來源
    是「官網 / 研究站 / GitHub repo + repo 內的 Markdown 檔」，不是影片。
    這支腳本把一份混合 seed（網址 + 檔案路徑）冪等地灌進一個 NotebookLM
    notebook，讓 Symcio 品牌知識能持續同步、跨 session 累積。

    和既有 pipeline 一樣：不攜帶任何憑證。NotebookLM 端走第三方 unofficial
    `notebooklm-py` CLI（browser automation，登你自己的 Google 帳號 session）。
    沒有官方 NotebookLM API；無法在無頭 / 沙箱環境跑，請在本機桌面執行。

PREREQS（使用者本機一次性設定）
    python -m pip install -U "notebooklm-py[browser]"
    python -m playwright install chromium
    notebooklm login                   # 開瀏覽器，登你的 Google 帳號（建議測試帳號）

USAGE
    python scripts/notebooklm_sync.py \\
        --seed data/symcio_notebooklm_seed.txt \\
        --notebook "Symcio Brand Knowledge Base"

    # 灌完順手問一題並存檔：
    python scripts/notebooklm_sync.py \\
        --seed data/symcio_notebooklm_seed.txt \\
        --notebook "Symcio Brand Knowledge Base" \\
        --ask "用繁中總結 Symcio 的 BCI 方法論與三個第一定位，每點引用來源。" \\
        --out outputs/notebooklm-symcio

SEED 格式（一行一個）
    http(s):// 開頭   → 網址 source
    其他              → 本機檔案 source（路徑相對於 repo 根目錄）
    `#` 開頭或行內 `#` 之後 → 註解

冪等性
    NotebookLM 端對重複 URL 會去重。本機檔案重跑會重新 add（NotebookLM
    依檔名/內容處理），低頻同步即可。新增來源只要編輯 seed 再重跑。
"""
from __future__ import annotations

import argparse
import json
import shlex
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Source:
    raw: str          # seed 原始字串（URL 或相對路徑）
    note: str = ""
    is_url: bool = False
    path: Path | None = None   # 本機檔案才有，已解析成絕對路徑


def repo_root() -> Path:
    # scripts/ 的上一層 = repo 根目錄
    return Path(__file__).resolve().parent.parent


def parse_seed(path: Path, root: Path) -> list[Source]:
    sources: list[Source] = []
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        head = raw_line.split("#", 1)
        token = head[0].strip()
        note = head[1].strip() if len(head) > 1 else ""
        if not token:
            continue
        if token.startswith("http://") or token.startswith("https://"):
            sources.append(Source(raw=token, note=note, is_url=True))
        else:
            sources.append(Source(raw=token, note=note, is_url=False, path=(root / token)))
    return sources


def run(cmd: list[str], *, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    """印出實際跑的指令 — visibility first。"""
    print(f"  ▸ {' '.join(shlex.quote(c) for c in cmd)}", flush=True)
    return subprocess.run(cmd, check=check, text=True, capture_output=capture)


def require_binary(name: str) -> None:
    try:
        run([name, "--version"], capture=True)
    except FileNotFoundError:
        sys.exit(
            f"✗ `{name}` 找不到。請先跑：\n"
            f'    python -m pip install -U "notebooklm-py[browser]"\n'
            f"    python -m playwright install chromium\n"
            f"    notebooklm login"
        )


def notebook_exists(notebook: str) -> bool:
    proc = run(["notebooklm", "list"], check=False, capture=True)
    return notebook in (proc.stdout or "")


def ensure_notebook(notebook: str) -> None:
    if notebook_exists(notebook):
        print(f"  · Notebook 已存在：{notebook}")
        return
    run(["notebooklm", "create", notebook])


def add_sources(notebook: str, sources: list[Source]) -> list[str]:
    """把 URL / 檔案逐一加進 notebook，回傳成功的 source ID。"""
    source_ids: list[str] = []
    for s in sources:
        if not s.is_url:
            if s.path is None or not s.path.exists():
                print(f"  ✗ 檔案找不到，跳過：{s.raw}")
                continue
            arg = str(s.path)
        else:
            arg = s.raw
        try:
            proc = run(
                ["notebooklm", "source", "add", "--notebook", notebook, "--json", arg],
                check=False,
                capture=True,
            )
            try:
                payload = json.loads(proc.stdout or "{}")
                sid = payload.get("id") or payload.get("source_id")
                if sid:
                    source_ids.append(sid)
            except json.JSONDecodeError:
                pass
        except Exception as exc:  # noqa: BLE001 — 單一來源失敗不該中斷整批
            print(f"  ✗ 加入 source 失敗，跳過 {s.raw}: {exc}")
    return source_ids


def wait_for_sources(notebook: str, source_ids: list[str], timeout: int = 300) -> None:
    """NotebookLM 要等 source 處理完才 ask 得到東西。"""
    for sid in source_ids:
        run(
            ["notebooklm", "source", "wait", "--notebook", notebook, "--timeout", str(timeout), sid],
            check=False,
        )


def ask_and_save(notebook: str, question: str, out_md: Path, out_json: Path) -> None:
    proc = run(["notebooklm", "ask", "--notebook", notebook, "--json", question], capture=True)
    out_json.write_text(proc.stdout or "", encoding="utf-8")
    try:
        payload = json.loads(proc.stdout or "{}")
        content = (
            payload.get("answer")
            or payload.get("content")
            or payload.get("response")
            or proc.stdout
        )
    except json.JSONDecodeError:
        content = proc.stdout or ""
    out_md.write_text((content or "").strip() + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="通用 NotebookLM 同步器（URL + 本機檔案）")
    ap.add_argument("--seed", required=True, type=Path, help="一行一個 source（URL 或檔案路徑）")
    ap.add_argument("--notebook", required=True, help="NotebookLM notebook 標題")
    ap.add_argument("--ask", default=None, help="（選用）灌完後丟給 NotebookLM 的問題")
    ap.add_argument("--out", type=Path, default=None, help="（選用，搭配 --ask）答案輸出目錄")
    ap.add_argument("--timeout", type=int, default=300, help="每個 source 處理等待秒數")
    args = ap.parse_args()

    root = repo_root()
    if not args.seed.exists():
        sys.exit(f"✗ seed 檔找不到：{args.seed}")

    require_binary("notebooklm")

    sources = parse_seed(args.seed, root)
    if not sources:
        sys.exit("✗ seed 檔沒有任何 source")
    n_url = sum(1 for s in sources if s.is_url)
    print(f"讀到 {len(sources)} 個 source（網址 {n_url}、檔案 {len(sources) - n_url}）。")

    print(f"\n[1/3] ensure notebook '{args.notebook}' + add sources")
    ensure_notebook(args.notebook)
    source_ids = add_sources(args.notebook, sources)

    print(f"\n[2/3] wait for {len(source_ids)} sources to finish processing")
    wait_for_sources(args.notebook, source_ids, timeout=args.timeout)

    if args.ask:
        out_dir = args.out or (root / "outputs" / "notebooklm-symcio")
        out_dir.mkdir(parents=True, exist_ok=True)
        print("\n[3/3] ask NotebookLM + save")
        ask_and_save(
            args.notebook,
            args.ask,
            out_md=out_dir / "answer.md",
            out_json=out_dir / "raw-response.json",
        )
        print(f"\n✓ 完成。答案：{out_dir / 'answer.md'}")
    else:
        print("\n[3/3] 略過 ask（未給 --ask）")
        print(f"\n✓ 完成。已把 {len(source_ids)} 個 source 同步進 '{args.notebook}'。")
        print(f"  同步時間：{time.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
