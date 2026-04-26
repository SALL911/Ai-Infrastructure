#!/usr/bin/env python3
"""
YouTube → yt-dlp → NotebookLM pipeline.

WHY
    把一批 YouTube 影片灌進 NotebookLM 做深度比較分析，輸出 mind map
    + infographic + Markdown 彙整報告。第三方 notebooklm-py 是 unofficial
    browser-automation，CLI 背後其實登你自己的 Google 帳號。所以這支腳本
    不攜帶任何憑證，單純協調 yt-dlp 與 notebooklm CLI，所有 auth 都走
    `notebooklm login` 存在你本機的 session。

PREREQS（使用者本機一次性設定）
    python -m pip install -U yt-dlp
    python -m pip install -U "notebooklm-py[browser]"
    python -m playwright install chromium
    notebooklm login                   # 會開瀏覽器，登你的 Google 帳號

USAGE
    python scripts/notebooklm_research.py \\
        --seed data/claude_code_skills_seed.txt \\
        --notebook "Claude Code Skills Landscape 2026" \\
        --out outputs/notebooklm-research

    後續重跑：已抓過的 metadata 會跳過，只補新影片。NotebookLM 端則是
    idempotent 加 source（重複 URL 會被 NotebookLM 去重）。

輸出結構
    outputs/notebooklm-research/
        youtube/                      # yt-dlp 產出（info.json + en.vtt）
        notebooklm/
            analysis.md               # NotebookLM chat 回答（結構化萃取）
            mind-map.json             # CLI 輸出節點關係 JSON（不是 PNG）
            infographic.png           # --style sketch-note 手繪藍圖
            raw-response.json         # CLI ask 的原始 JSON 便於 debug
        report.md                     # pipeline 自產的 index
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


# ── 分析提問（會丟給 NotebookLM 的 chat）──
# 放這裡是因為 prompt 本身是 IP：改 prompt 要審核，而 prompt 改動要能在 git diff 看到。
ANALYSIS_PROMPT = """\
You are analyzing a batch of YouTube videos about Anthropic's Claude Code CLI, with a
focus on its "skills" system (the /skill invocation, skill plugins, workflow patterns).

Cross-reference ALL sources and produce a structured report in Traditional Chinese
(繁體中文) with the following sections. For every claim, cite which video(s) mentioned
it (use the video title or a short identifier).

1. 最有價值的 10 個 Claude Code skills（排序：實用性 × 覆蓋度）
   - 每一項：skill 名 → 1 句話用途 → 代表場景 → 引用來源

2. 不同影片間的共識 vs 分歧
   - 共識（≥3 支提到同一建議）
   - 分歧（明顯意見衝突的點）

3. 新手 / 進階 / 團隊 三種使用情境各自的 skill 組合建議

4. 被多數影片忽略、但實際很關鍵的盲點（你判斷）

5. 「下一步該學什麼」的學習路徑，從 0 到 100

輸出格式：Markdown，每段不超過 4 行。避免贅詞。
"""


@dataclass
class Video:
    url: str
    video_id: str
    note: str = ""


def parse_seed(path: Path) -> list[Video]:
    videos: list[Video] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)
        url = line[0].strip()
        note = line[1].strip() if len(line) > 1 else ""
        if not url:
            continue
        video_id = url.rsplit("=", 1)[-1] if "=" in url else url.rsplit("/", 1)[-1]
        videos.append(Video(url=url, video_id=video_id, note=note))
    return videos


def run(cmd: list[str], *, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    """Thin subprocess wrapper that prints what it runs — visibility first."""
    print(f"  ▸ {' '.join(shlex.quote(c) for c in cmd)}", flush=True)
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        capture_output=capture,
    )


def require_binary(name: str) -> None:
    try:
        run([name, "--version"], capture=True)
    except FileNotFoundError:
        sys.exit(
            f"✗ `{name}` 找不到。請先跑：\n"
            f"    python -m pip install -U {'yt-dlp' if name == 'yt-dlp' else 'notebooklm-py[browser]'}"
        )


def fetch_youtube(videos: list[Video], out_dir: Path) -> list[Video]:
    """yt-dlp → info.json + subs，跳過已抓過的。"""
    out_dir.mkdir(parents=True, exist_ok=True)
    ok: list[Video] = []
    for v in videos:
        info = out_dir / f"{v.video_id}.info.json"
        if info.exists():
            print(f"  · 已快取：{v.video_id}")
            ok.append(v)
            continue
        try:
            run([
                "yt-dlp",
                "--skip-download",
                "--write-info-json",
                "--write-auto-subs",
                "--sub-langs", "en",
                "--output", str(out_dir / "%(id)s.%(ext)s"),
                v.url,
            ])
            ok.append(v)
        except subprocess.CalledProcessError:
            print(f"  ✗ yt-dlp 失敗，跳過：{v.url}")
    return ok


def notebook_exists(notebook: str) -> bool:
    proc = run(["notebooklm", "list"], check=False, capture=True)
    return notebook in (proc.stdout or "")


def ensure_notebook(notebook: str) -> None:
    if notebook_exists(notebook):
        print(f"  · Notebook 已存在：{notebook}")
        return
    run(["notebooklm", "create", notebook])


def add_sources(notebook: str, videos: list[Video]) -> list[str]:
    """回傳成功加入的 source ID,供後續 `source wait` 用。"""
    source_ids: list[str] = []
    for v in videos:
        try:
            proc = run([
                "notebooklm", "source", "add",
                "--notebook", notebook,
                "--json",
                v.url,
            ], check=False, capture=True)
            try:
                payload = json.loads(proc.stdout or "{}")
                sid = payload.get("id") or payload.get("source_id")
                if sid:
                    source_ids.append(sid)
            except json.JSONDecodeError:
                pass
        except Exception as exc:
            print(f"  ✗ 加入 source 失敗，跳過 {v.url}: {exc}")
    return source_ids


def wait_for_sources(notebook: str, source_ids: list[str], timeout: int = 300) -> None:
    """NotebookLM 要等 source 處理完才能 ask 到東西,否則回空。"""
    for sid in source_ids:
        run([
            "notebooklm", "source", "wait",
            "--notebook", notebook,
            "--timeout", str(timeout),
            sid,
        ], check=False)


def ask_and_save(notebook: str, question: str, out_md: Path, out_json: Path) -> None:
    proc = run([
        "notebooklm", "ask",
        "--notebook", notebook,
        "--json",
        question,
    ], capture=True)
    out_json.write_text(proc.stdout or "", encoding="utf-8")
    # 盡量從 JSON 抽 content；不同版本 schema 可能不同，抓常見欄位。
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
    out_md.write_text(content.strip() + "\n", encoding="utf-8")


def generate_and_download(
    notebook: str,
    artifact: str,
    out_path: Path,
    extra: list[str] | None = None,
    supports_wait: bool = False,
) -> None:
    """artifact: CLI 名稱（'mind-map' | 'infographic' | ...),連字號拼法。

    注意：`generate infographic` 有 `--wait`,但 `generate mind-map` 沒有。
    對沒有 --wait 的 artifact,改用 `artifact poll` 輪詢直到完成。
    """
    try:
        cmd = [
            "notebooklm", "generate", artifact,
            "--notebook", notebook,
            *(extra or []),
        ]
        if supports_wait:
            cmd.append("--wait")
        else:
            # 沒 --wait 的 artifact（如 mind-map):先用 --json 拿 ID,再 `artifact wait`
            cmd.append("--json")
        proc = run(cmd, capture=not supports_wait)

        if not supports_wait:
            artifact_id: str | None = None
            try:
                payload = json.loads(proc.stdout or "{}")
                artifact_id = (
                    payload.get("artifact_id")
                    or payload.get("id")
                    or payload.get("task_id")
                )
            except json.JSONDecodeError:
                pass
            if artifact_id:
                run([
                    "notebooklm", "artifact", "wait",
                    "--notebook", notebook,
                    "--timeout", "600",
                    artifact_id,
                ], check=False)
            else:
                print(f"  ⚠ 沒拿到 {artifact} artifact ID,直接嘗試下載最新的。")

        run([
            "notebooklm", "download", artifact,
            "--notebook", notebook,
            "--force",
            str(out_path),
        ])
    except subprocess.CalledProcessError as exc:
        print(f"  ✗ {artifact} 產出失敗：{exc}")


def write_report(
    out_dir: Path,
    notebook: str,
    videos: list[Video],
    analysis_md: Path,
    mind_map: Path,
    infographic: Path,
) -> None:
    lines = [
        f"# {notebook} — Pipeline Report",
        "",
        f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S %Z')}",
        "",
        "## Inputs",
        "",
    ]
    for v in videos:
        lines.append(f"- [{v.note or v.video_id}]({v.url})")
    lines.extend([
        "",
        "## Deep analysis (NotebookLM)",
        "",
        f"Full answer: [`{analysis_md.name}`]({analysis_md.name})",
        "",
        "## Visual artifacts",
        "",
        f"- Mind map: `{mind_map.name}`" + (" ✓" if mind_map.exists() else " ✗ (generation failed)"),
        f"- Infographic: `{infographic.name}`" + (" ✓" if infographic.exists() else " ✗ (generation failed)"),
        "",
        "## 注意事項",
        "",
        "- Infographic 用 `--style sketch-note`（手繪藍圖風）+ `--detail detailed` 產出。",
        "  其他可選風格：professional / bento-grid / editorial / instructional / bricks / clay / anime / kawaii / scientific。",
        "- Mind-map 的 CLI 輸出是 JSON（節點關係圖），不是 PNG；要視覺化請餵進 mind-map 渲染器。",
        "- yt-dlp 的 auto-captions 偶爾被 YouTube 擋，失敗的影片 NotebookLM 仍能從標題/描述擷取。",
        "- 第一次跑會在 `source wait` 卡最久（NotebookLM 伺服器端處理影片字幕）。預設 timeout 300 秒。",
    ])
    (out_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="YouTube → NotebookLM research pipeline")
    ap.add_argument("--seed", required=True, type=Path, help="一行一個 YouTube URL 的清單")
    ap.add_argument("--notebook", required=True, help="NotebookLM notebook 標題")
    ap.add_argument("--out", required=True, type=Path, help="輸出根目錄")
    args = ap.parse_args()

    if not args.seed.exists():
        sys.exit(f"✗ seed 檔找不到：{args.seed}")

    require_binary("yt-dlp")
    require_binary("notebooklm")

    videos = parse_seed(args.seed)
    if not videos:
        sys.exit("✗ seed 檔沒有任何 URL")
    print(f"讀到 {len(videos)} 支影片。")

    yt_dir = args.out / "youtube"
    nlm_dir = args.out / "notebooklm"
    nlm_dir.mkdir(parents=True, exist_ok=True)

    print("\n[1/5] yt-dlp fetch metadata + subs")
    videos = fetch_youtube(videos, yt_dir)

    print(f"\n[2/5] NotebookLM ensure notebook '{args.notebook}' + add sources")
    ensure_notebook(args.notebook)
    source_ids = add_sources(args.notebook, videos)

    print(f"\n[3/5] NotebookLM wait for {len(source_ids)} sources to finish processing")
    wait_for_sources(args.notebook, source_ids)

    print("\n[4/5] NotebookLM ask for structured analysis")
    ask_and_save(
        args.notebook,
        ANALYSIS_PROMPT,
        out_md=nlm_dir / "analysis.md",
        out_json=nlm_dir / "raw-response.json",
    )

    print("\n[5/5] NotebookLM generate + download mind-map & infographic (sketch-note style)")
    mind_map = nlm_dir / "mind-map.json"   # CLI 對 mind-map 輸出的是 JSON,不是 PNG
    infographic = nlm_dir / "infographic.png"
    generate_and_download(args.notebook, "mind-map", mind_map, supports_wait=False)
    generate_and_download(
        args.notebook,
        "infographic",
        infographic,
        extra=[
            "--style", "sketch-note",        # 手繪藍圖風
            "--detail", "detailed",
            "--orientation", "landscape",
            "--language", "zh-TW",
        ],
        supports_wait=True,
    )

    write_report(
        args.out,
        args.notebook,
        videos,
        analysis_md=nlm_dir / "analysis.md",
        mind_map=mind_map,
        infographic=infographic,
    )

    print(f"\n✓ 完成。看：{args.out / 'report.md'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
