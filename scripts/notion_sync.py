"""
Notion → BrandOS repo 單向同步
------------------------------
讀取指定 Notion database 下的所有頁面，轉成 Markdown 寫入
docs/notion-sync/<slug>.md，再由 workflow 決定 commit 或開 PR。

環境變數：
  NOTION_API_KEY      Notion integration token（internal 或 OAuth）
  NOTION_DATABASE_ID  要同步的 database ID（可逗號分隔多個）
  OUTPUT_DIR          輸出目錄，預設 docs/notion-sync

用法：
  python scripts/notion_sync.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import urllib.request
import urllib.error

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _request(method: str, path: str, token: str, body: dict | None = None) -> dict:
    url = f"{NOTION_API}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Notion-Version", NOTION_VERSION)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="ignore")
        raise SystemExit(f"Notion API {e.code} on {path}: {msg}") from e


def query_database(database_id: str, token: str) -> list[dict]:
    results, cursor = [], None
    while True:
        body: dict[str, Any] = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        resp = _request("POST", f"/databases/{database_id}/query", token, body)
        results.extend(resp.get("results", []))
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return results


def fetch_blocks(block_id: str, token: str) -> list[dict]:
    blocks, cursor = [], None
    while True:
        path = f"/blocks/{block_id}/children?page_size=100"
        if cursor:
            path += f"&start_cursor={cursor}"
        resp = _request("GET", path, token)
        blocks.extend(resp.get("results", []))
        if not resp.get("has_more"):
            break
        cursor = resp.get("next_cursor")
    return blocks


def rich_text(items: list[dict]) -> str:
    return "".join(i.get("plain_text", "") for i in items)


def block_to_markdown(block: dict, depth: int = 0) -> str:
    t = block.get("type", "")
    payload = block.get(t, {})
    indent = "  " * depth

    if t == "paragraph":
        return f"{indent}{rich_text(payload.get('rich_text', []))}\n\n"
    if t in ("heading_1", "heading_2", "heading_3"):
        level = int(t[-1])
        return f"{'#' * level} {rich_text(payload.get('rich_text', []))}\n\n"
    if t == "bulleted_list_item":
        return f"{indent}- {rich_text(payload.get('rich_text', []))}\n"
    if t == "numbered_list_item":
        return f"{indent}1. {rich_text(payload.get('rich_text', []))}\n"
    if t == "to_do":
        check = "x" if payload.get("checked") else " "
        return f"{indent}- [{check}] {rich_text(payload.get('rich_text', []))}\n"
    if t == "code":
        lang = payload.get("language", "")
        code = rich_text(payload.get("rich_text", []))
        return f"```{lang}\n{code}\n```\n\n"
    if t == "quote":
        return f"> {rich_text(payload.get('rich_text', []))}\n\n"
    if t == "divider":
        return "---\n\n"
    if t == "callout":
        return f"> **Note:** {rich_text(payload.get('rich_text', []))}\n\n"
    return ""


def slugify(title: str) -> str:
    s = re.sub(r"[^\w\u4e00-\u9fff-]+", "-", title.strip(), flags=re.UNICODE)
    return re.sub(r"-+", "-", s).strip("-").lower() or "untitled"


def page_title(page: dict) -> str:
    for prop in page.get("properties", {}).values():
        if prop.get("type") == "title":
            return rich_text(prop.get("title", [])) or "Untitled"
    return "Untitled"


def render_page(page: dict, token: str) -> tuple[str, str]:
    title = page_title(page)
    blocks = fetch_blocks(page["id"], token)
    body = "".join(block_to_markdown(b) for b in blocks)
    front_matter = (
        "---\n"
        f'notion_id: "{page["id"]}"\n'
        f'title: "{title}"\n'
        f'last_edited: "{page.get("last_edited_time", "")}"\n'
        f'url: "{page.get("url", "")}"\n'
        "---\n\n"
    )
    return slugify(title), f"{front_matter}# {title}\n\n{body}"


def main() -> int:
    token = os.environ.get("NOTION_API_KEY", "").strip()
    db_ids = [d.strip() for d in os.environ.get("NOTION_DATABASE_ID", "").split(",") if d.strip()]
    out_dir = Path(os.environ.get("OUTPUT_DIR", "docs/notion-sync"))

    if not token:
        print("ERROR: NOTION_API_KEY not set", file=sys.stderr)
        return 2
    if not db_ids:
        print("ERROR: NOTION_DATABASE_ID not set", file=sys.stderr)
        return 2

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / ".keep").touch(exist_ok=True)

    written = 0
    for db_id in db_ids:
        print(f"==> Querying database {db_id}")
        pages = query_database(db_id, token)
        print(f"    found {len(pages)} pages")
        for page in pages:
            slug, content = render_page(page, token)
            target = out_dir / f"{slug}.md"
            target.write_text(content, encoding="utf-8")
            written += 1
            print(f"    wrote {target}")

    print(f"Done. {written} pages synced to {out_dir}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
