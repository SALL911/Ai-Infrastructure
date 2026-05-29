---
name: symcio-template
description: >
  Symcio 全識品牌簡報模板系統。當用戶提到「symcio模板」、「Symcio簡報」、
  「Symcio 版型」、「全識模板」、「品牌簡報」、「做一份 Symcio deck」、
  「用 Symcio 模板」、「LinkedIn 簡報」或任何需要按照 Symcio 品牌視覺規範
  生成 PDF/PPTX 簡報的需求，一律使用此 Skill。
  此 Skill 定義了 12 種可複用 Layout（A-L），包含封面、Split、三欄卡片、
  Hub&Spoke、產品展示、Venn 圖、樹狀圖、表格、四宮格、人物卡、時間軸、
  願景頁。執行時自動處理：多餘版位整個刪除、文字溢出自動濃縮、
  中文字型統一 Noto Sans TC。
  關鍵觸發詞：symcio模板、Symcio 版型、全識簡報、品牌 deck、
  Symcio pitch deck、做簡報、Symcio template。
compatibility: "需要 bash_tool、create_file、pptx skill 或 pdf skill"
---

# Symcio Template Skill

## 概述

本 Skill 基於 Symcio 全識的 18 頁 Canva 品牌簡報模板，提供 12 種標準化 Layout。
收到「做 Symcio 模板」類指令時，按以下流程執行。

---

## 執行流程

### Step 1 — 讀取 Layout 規格

```
view .claude/skills/symcio-template/references/layouts.md
```

先讀取完整 Layout 規格，再根據用戶的內容選擇適合的 Layout 組合。

### Step 2 — Layout 選擇矩陣

根據內容類型自動配對：

| 內容類型 | 首選 Layout | 備選 |
|---------|-----------|------|
| 封面/結尾 | A (Hero Cover) | L (Vision) |
| 痛點/問題 | B (Split) | C (3-Column) |
| 解決方案 | D (Hub & Spoke) | C (3-Column) |
| 產品功能 | E (Product Demo) | C (3-Column) |
| 商業模式 | F (Venn) | G (Tree Map) |
| 競品分析 | H (Table + Card) | — |
| 市場規模 | F2 (同心圓 TAM/SAM/SOM) | B (Split) |
| 發展路線 | K (Timeline) | — |
| Traction/成果 | I (Quad Grid) | H (Table + Card) |
| 團隊介紹 | J (Profile Cards) | I (Quad Grid) |
| 財務/募資 | B (Split + Charts) | — |
| CTA/願景 | L (Vision Banner) | A (Hero Cover) |

### Step 3 — 套用內容 + 三條強制規則

---

## ⚠️ 三條強制規則（每次產出必須遵守）

### 規則 1 — 多餘版位整個刪除

**情境：** Layout 設計有 N 個版位，但實際內容只需 M 個（M < N）。

**執行方式：**
- 將多餘版位**整個刪除**（包含 Icon/照片框、標題、說明文字、底部 tagline、分隔線）
- **絕對不可**只清空文字留下空白框或佔位符
- 刪除後重新分配剩餘版位的水平間距，保持視覺平衡

**具體場景範例：**

| Layout | 原設計 | 實際需要 | 處理方式 |
|--------|-------|---------|---------|
| C (三欄) | 3 欄 | 2 項 | 刪除第 3 欄，剩餘 2 欄居中對齊 |
| J (人物卡) | 3 張卡 | 2 人 | 刪除第 3 張卡片（含照片+引號+文字+姓名），2 張居中 |
| J (人物卡) | 3 張卡 | 1 人 | **不使用 Layout J**，改用 Layout B 或其他單人版型 |
| I (四宮格) | 4 格 | 3 項 | 刪除 1 格，剩餘 3 格改為橫排（類似 Layout C） |
| K (時間軸) | 3 階段 | 2 階段 | 刪除第 3 階段，2 階段居中 + 箭頭縮短 |
| L (願景) | 5 圓形 | 3 項 | 刪除 2 個圓形，3 個居中 |

### 規則 2 — 文字溢出自動濃縮

**觸發條件：** 填入文字超過 Layout 規格中定義的字數上限。

**執行方式：**
1. 先計算填入文字的字數 vs Layout 容量上限
2. 如超出 > 20%，自動濃縮：
   - 刪除修飾語、副詞
   - 合併同義表述
   - 保留核心數據和關鍵結論
3. 濃縮後仍超出 → 拆為兩頁（使用相同 Layout 分頁）
4. **絕對不可**縮小字型來硬塞內容（破壞品牌規範）

**各 Layout 文字容量速查：**

| Layout | 大標題上限 | 每區塊上限 | 備註 |
|--------|---------|---------|------|
| A 封面 | 12字×2行 | 副標 4行×30字 | — |
| B Split | 16字 | 列點 3項×20字 | 右欄為圖，不放文字 |
| C 三欄 | 22字 | 每欄 40字 | 小標 ≤6字 |
| D Hub | 全寬 | 每分支 40字 | 分支標題 ≤6字 |
| E Demo | 全寬 | 底部 3行×25字 | 截圖不可編輯 |
| F Venn | 全寬 | 外部標籤 ≤8字 | 同心圓右側 ≤3行 |
| G Tree | 全寬 | 每節點 ≤6字 | 純文字 |
| H Table | 全寬 | 每格 ≤20字 | 底部卡片 ≤30字 |
| I Quad | 全寬 | 每格 ≤2項×20字 | 標題 ≤6字 |
| J 人物 | 全寬 | 每卡 ≤50字 | 姓名+職稱各1行 |
| K 時間軸 | 全寬 | 每階段 ≤50字 | 標題 ≤8字 |
| L 願景 | ≤25字 | 圓形標籤 ≤4字 | 最少 3 圓 |

### 規則 3 — 字型規範

**中文：** 所有中文段落、標題、標籤、說明文字一律使用 **Noto Sans TC**（思源黑體）。
- 標題粗體：Noto Sans TC Bold / Black
- 內文：Noto Sans TC Regular / Medium
- 標籤/小字：Noto Sans TC Medium

**英文：** 保留原始設計中的英文字型，不做變更。
- 如原檔無特定英文字型資訊，英文部分也使用 Noto Sans TC
- 品牌名稱「symcio」「Symcio」「BrandOS」等保持原樣

**混排處理：**
- 中英混排段落（如「ESG 報告」「Scope 3」）：中文用 Noto Sans TC，英文保持原字型
- 在 python-pptx / reportlab 等程式中，對整個 text run 設定 Noto Sans TC，
  英文字元會 fallback 到系統英文字型

---

## 色彩規範

```python
# Symcio 品牌色彩常數
COLORS = {
    "primary_dark_green": "#1B4332",   # 主色：背景、Tag、強調
    "bg_warm_gray": "#F0EDE8",         # 內容頁底色
    "white": "#FFFFFF",                # 深色底文字
    "accent_red": "#C1121F",           # 警示/對比數字
    "accent_olive": "#6B8E23",         # 次要標籤
    "tag_bg": "#1B4332",               # 左上角 Tag 背景
    "tag_text": "#FFFFFF",             # Tag 內文字
    "gradient_green_light": "#2D6A4F", # 漸層用
    "gradient_green_dark": "#081C15",  # 漸層用
}
```

---

## 每頁固定元素

1. **左上角 Tag：** 深綠矩形 (`#1B4332`)，白字，標明頁面主題（如「市場問題」「解決方案」）
2. **右上角 Logo：** Symcio 雙括號 Logo，深綠或白色（依底色自動切換）
3. **底部裝飾：** 綠色漸層霧化（左下/右下角），僅部分頁面
4. **底部資訊列（僅封面/結尾）：** www.symcio.tw + tagline + 碳智IP

---

## 輸出格式

依用戶需求選擇：

| 輸出格式 | 工具 | 適用場景 |
|---------|------|--------|
| .pptx | 讀取 pptx skill | 需要編輯的簡報 |
| .pdf | 讀取 pdf skill | 最終分享用 |
| .html (React) | create_file → .jsx | 互動展示頁 |

---

## 品質檢查（每次輸出前確認）

- [ ] 所有中文字型是否設為 Noto Sans TC？
- [ ] 是否有空白版位未刪除？（違反規則 1）
- [ ] 是否有文字溢出版面？（違反規則 2）
- [ ] 左上角 Tag 是否每頁都有？
- [ ] 品牌色是否正確（深綠 #1B4332 / 米灰 #F0EDE8）？
- [ ] 品牌名稱「Symcio 全識」拼寫是否正確？
- [ ] 英文字型是否保持不變？
