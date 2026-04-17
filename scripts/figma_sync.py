"""
Figma → BrandOS repo 單向同步
-----------------------------
拉取 Figma 檔案的結構（節點樹、frames、components、styles）並輸出：
  1. docs/design/figma-structure.json — 完整結構快照
  2. docs/design/figma-frames.md      — 人類可讀的 frame 清單 + 連結
  3. docs/design/design-tokens.json   — 顏色、字體、間距（供前端使用）

環境變數：
  FIGMA_TOKEN     必填，Figma Personal Access Token（settings → Personal access tokens）
  FIGMA_FILE_KEY  必填，File key（URL 中 /file/ 或 /make/ 後那 22 字元）
  OUTPUT_DIR      選，預設 docs/design

用法：
  FIGMA_TOKEN=figd_xxx FIGMA_FILE_KEY=AkUJholqQlnBUw6kOnOQMk python scripts/figma_sync.py
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib import request
from urllib.error import HTTPError, URLError


FIGMA_API = "https://api.figma.com/v1"


def _get(path: str, token: str) -> dict:
    req = request.Request(f"{FIGMA_API}{path}", headers={"X-Figma-Token": token})
    try:
        with request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        body = e.read().decode(errors="ignore")
        raise SystemExit(f"Figma API {e.code} on {path}: {body}") from e
    except URLError as e:
        raise SystemExit(f"Figma API URL error: {e.reason}") from e


def collect_frames(node: dict, acc: list[dict], path: str = "") -> None:
    """遞迴收集所有 FRAME 與 COMPONENT 節點。"""
    node_type = node.get("type", "")
    node_name = node.get("name", "")
    full_path = f"{path}/{node_name}" if path else node_name

    if node_type in ("FRAME", "COMPONENT", "COMPONENT_SET"):
        acc.append({
            "id": node.get("id"),
            "name": node_name,
            "type": node_type,
            "path": full_path,
        })

    for child in node.get("children", []):
        collect_frames(child, acc, full_path)


def extract_tokens(file_data: dict) -> dict:
    """從 styles 萃取 design tokens。"""
    tokens: dict[str, Any] = {"colors": {}, "text": {}, "effects": {}}
    styles = file_data.get("styles", {})
    for style_id, meta in styles.items():
        style_type = meta.get("styleType", "").lower()
        name = meta.get("name", style_id)
        bucket = {
            "fill": "colors",
            "text": "text",
            "effect": "effects",
            "grid": "grids",
        }.get(style_type)
        if bucket:
            tokens.setdefault(bucket, {})[name] = {
                "id": style_id,
                "description": meta.get("description", ""),
            }
    return tokens


def render_frames_md(frames: list[dict], file_key: str, file_name: str) -> str:
    lines = [
        f"# Figma 同步：{file_name}",
        "",
        f"Source file: https://www.figma.com/file/{file_key}",
        f"Total frames / components: {len(frames)}",
        "",
        "| Type | Path | Node ID | Link |",
        "|------|------|---------|------|",
    ]
    for f in frames:
        node_id = (f.get("id") or "").replace(":", "-")
        link = f"https://www.figma.com/file/{file_key}?node-id={node_id}"
        lines.append(
            f"| {f['type']} | {f['path']} | `{f['id']}` | [open]({link}) |"
        )
    return "\n".join(lines) + "\n"


def main() -> int:
    token = os.environ.get("FIGMA_TOKEN", "").strip()
    file_key = os.environ.get("FIGMA_FILE_KEY", "").strip()
    out_dir = Path(os.environ.get("OUTPUT_DIR", "docs/design"))

    if not token:
        print("ERROR: FIGMA_TOKEN not set", file=sys.stderr)
        return 2
    if not file_key:
        print("ERROR: FIGMA_FILE_KEY not set", file=sys.stderr)
        return 2

    print(f"==> Fetching Figma file {file_key}")
    data = _get(f"/files/{file_key}", token)
    file_name = data.get("name", "untitled")
    print(f"    File: {file_name}")

    # Collect all frames
    frames: list[dict] = []
    document = data.get("document", {})
    collect_frames(document, frames)
    print(f"    Frames/Components: {len(frames)}")

    out_dir.mkdir(parents=True, exist_ok=True)

    # Write structure snapshot（去掉過大的 children 陣列以控制檔案大小）
    summary = {
        "file_name": file_name,
        "file_key": file_key,
        "last_modified": data.get("lastModified"),
        "version": data.get("version"),
        "frames": frames,
        "pages": [
            {"id": p.get("id"), "name": p.get("name")}
            for p in document.get("children", [])
        ],
    }
    (out_dir / "figma-structure.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Write human-readable frames list
    (out_dir / "figma-frames.md").write_text(
        render_frames_md(frames, file_key, file_name), encoding="utf-8"
    )

    # Write design tokens
    tokens = extract_tokens(data)
    (out_dir / "design-tokens.json").write_text(
        json.dumps(tokens, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"    Wrote {out_dir}/figma-structure.json")
    print(f"    Wrote {out_dir}/figma-frames.md")
    print(f"    Wrote {out_dir}/design-tokens.json")

    # Also write the file key to a stable location for reference
    (out_dir / "FIGMA_FILE.md").write_text(
        f"# Figma Source\n\n"
        f"- File name: **{file_name}**\n"
        f"- File key: `{file_key}`\n"
        f"- URL: https://www.figma.com/file/{file_key}\n"
        f"- Last synced: see `figma-structure.json` > `last_modified`\n\n"
        f"Sync cadence: weekly via `.github/workflows/figma-sync.yml` + on-demand workflow_dispatch.\n",
        encoding="utf-8",
    )
    print(f"    Wrote {out_dir}/FIGMA_FILE.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
