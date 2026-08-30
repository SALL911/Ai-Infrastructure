"""
HubSpot CRM Bootstrap — 欄位架構 + 代理商夥伴名單
--------------------------------------------------
把 `schemas/hubspot_crm_schema.json` 的欄位定義建進 HubSpot，
再把 `data/crm/agency_partners.csv` 的組織匯入 companies。

執行順序（腳本內部自動處理）：
1. 建立 property group（companies / contacts 各一組）
2. 建立自訂 properties（已存在則跳過，不覆寫）
3. 以 domain 或 name 比對既有 company，有則 update、無則 create

個資法約束（寫死在程式裡，不是靠人記得）：
- schema 的 contacts.forbidden_properties 若出現在要建立的欄位名稱中，直接中止
- brandos_org_type=vasp_exchange 的紀錄，public_disclosure_ok 強制寫成 false

環境變數：
  HUBSPOT_PRIVATE_APP_TOKEN   HubSpot → Settings → Integrations → Private Apps
                              需要 scopes: crm.objects.companies.write,
                              crm.schemas.companies.write, crm.schemas.contacts.write

可選：
  DRY_RUN=1     只印出將要送出的 payload，不呼叫 API（預設 1）
  ONLY=props    只建欄位；ONLY=data 只匯資料；預設兩者都做
"""

from __future__ import annotations

import csv
import json
import os
import sys
from pathlib import Path
from urllib import request
from urllib.error import HTTPError

API = "https://api.hubapi.com"
ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "schemas" / "hubspot_crm_schema.json"
CSV_PATH = ROOT / "data" / "crm" / "agency_partners.csv"

# 個資法第 6 條特種個資 — 任何欄位名稱命中這些字串就中止
FORBIDDEN_TOKENS = (
    "religio", "faith", "宗教", "信仰",
    "medical", "health_record", "病歷", "醫療", "健康檢查",
    "genetic", "基因", "sex_life", "性生活",
    "criminal", "前科",
)


def _http(method: str, path: str, token: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode() or "{}")


def assert_no_sensitive_fields(props: list[dict]) -> None:
    """個資法第 6 條守門員。命中即中止整個 bootstrap。"""
    for p in props:
        blob = f"{p.get('name','')} {p.get('label','')}".lower()
        for token in FORBIDDEN_TOKENS:
            if token.lower() in blob:
                sys.exit(
                    f"ABORT: 欄位 '{p.get('name')}' / '{p.get('label')}' 命中特種個資關鍵字 "
                    f"'{token}'（個資法第6條）。請改以組織屬性建模，不得對自然人建檔。"
                )


def ensure_group(object_type: str, name: str, label: str, token: str, dry: bool) -> None:
    if dry:
        print(f"[dry-run] POST /crm/v3/properties/{object_type}/groups {name}")
        return
    try:
        _http(
            "POST",
            f"/crm/v3/properties/{object_type}/groups",
            token,
            {"name": name, "label": label, "displayOrder": -1},
        )
        print(f"[group created] {object_type}.{name}")
    except HTTPError as e:
        if e.code == 409:
            print(f"[group exists] {object_type}.{name}")
        else:
            raise


def existing_property_names(object_type: str, token: str) -> set[str]:
    res = _http("GET", f"/crm/v3/properties/{object_type}", token)
    return {p["name"] for p in res.get("results", [])}


def create_properties(object_type: str, group: str, props: list[dict], token: str, dry: bool) -> None:
    existing = set() if dry else existing_property_names(object_type, token)
    for p in props:
        if p["name"] in existing:
            print(f"[prop exists, skipped] {object_type}.{p['name']}")
            continue
        payload = {
            "name": p["name"],
            "label": p["label"],
            "type": p["type"],
            "fieldType": p["fieldType"],
            "groupName": group,
            "description": p.get("description", ""),
        }
        if "options" in p:
            payload["options"] = [
                {"label": o["label"], "value": o["value"], "displayOrder": i}
                for i, o in enumerate(p["options"])
            ]
        if dry:
            print(f"[dry-run] POST /crm/v3/properties/{object_type} :: {p['name']} ({p['fieldType']})")
            continue
        _http("POST", f"/crm/v3/properties/{object_type}", token, payload)
        print(f"[prop created] {object_type}.{p['name']}")


def find_company(row: dict, token: str) -> str | None:
    """先用 domain 找，找不到再用 name 找。"""
    for prop, value in (("domain", row.get("domain")), ("name", row.get("name"))):
        if not value or not value.strip():
            continue
        res = _http(
            "POST",
            "/crm/v3/objects/companies/search",
            token,
            {
                "filterGroups": [
                    {"filters": [{"propertyName": prop, "operator": "EQ", "value": value.strip()}]}
                ],
                "properties": ["name", "domain"],
                "limit": 1,
            },
        )
        results = res.get("results", [])
        if results:
            return results[0]["id"]
    return None


def row_to_properties(row: dict) -> dict:
    props = {
        "name": row["name"],
        "phone": row.get("phone", ""),
        "brandos_org_type": row.get("brandos_org_type", ""),
        "brandos_county_city": row.get("brandos_county_city", ""),
        "brandos_relationship_stage": row.get("brandos_relationship_stage", "cold"),
        "brandos_source_node": row.get("brandos_source_node", ""),
        "brandos_consent_basis": row.get("brandos_consent_basis", "public_business_contact"),
        "description": row.get("notes", ""),
    }
    if row.get("domain", "").strip():
        props["domain"] = row["domain"].strip()

    # 交易所永遠不可公開揭露，不管 CSV 寫什麼
    disclosure = row.get("brandos_public_disclosure_ok", "true").strip().lower()
    if row.get("brandos_org_type") == "vasp_exchange":
        disclosure = "false"
    props["brandos_public_disclosure_ok"] = disclosure

    return {k: v for k, v in props.items() if v not in ("", None)}


def import_companies(token: str, dry: bool) -> None:
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8")))
    created = updated = 0
    for row in rows:
        props = row_to_properties(row)
        if dry:
            print(f"[dry-run] upsert company :: {row['name']} -> {json.dumps(props, ensure_ascii=False)}")
            continue
        company_id = find_company(row, token)
        if company_id:
            _http("PATCH", f"/crm/v3/objects/companies/{company_id}", token, {"properties": props})
            updated += 1
            print(f"[updated] {row['name']} (id={company_id})")
        else:
            res = _http("POST", "/crm/v3/objects/companies", token, {"properties": props})
            created += 1
            print(f"[created] {row['name']} (id={res.get('id')})")
    print(f"Companies — created: {created}, updated: {updated}, total rows: {len(rows)}")


def main() -> None:
    dry = os.environ.get("DRY_RUN", "1") != "0"
    only = os.environ.get("ONLY", "").strip().lower()
    token = os.environ.get("HUBSPOT_PRIVATE_APP_TOKEN", "")

    if not dry and not token:
        sys.exit("Missing HUBSPOT_PRIVATE_APP_TOKEN. Set DRY_RUN=1 to preview without it.")

    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    if only != "data":
        for object_type in ("companies", "contacts"):
            spec = schema["objects"][object_type]
            assert_no_sensitive_fields(spec["properties"])
            ensure_group(object_type, spec["groupName"], spec["groupLabel"], token, dry)
            create_properties(object_type, spec["groupName"], spec["properties"], token, dry)

    if only != "props":
        import_companies(token, dry)

    print(
        "Done (dry-run). Set DRY_RUN=0 with HUBSPOT_PRIVATE_APP_TOKEN to write to HubSpot."
        if dry
        else "Done. Written to HubSpot."
    )


if __name__ == "__main__":
    main()
