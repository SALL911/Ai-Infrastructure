# BCI 發表包 — 快速開始

## 你拿到的東西
```
bci-publishing-kit/
├── 00-INDEX/                      # 總覽 + 自動化指南
│   ├── README.md                  # ← 從這裡開始讀
│   ├── AUTOMATION-GUIDE.md        # 30 天執行排程
│   └── QUICK-START.md             # ← 你現在看的這份
├── P0-github/                     # 🔴 必做：時間戳
├── P0-zenodo/                     # 🔴 必做：DOI
├── P0-ssrn/                       # 🔴 必做：學術預印本
├── P1-researchgate/               # 🟡 學術社群
├── P1-orcid/                      # 🟡 統一學術身份
├── P1-linkedin/                   # 🟡 產業觸及
├── P1-medium/                     # 🟡 國際 SEO
├── P2-osf/                        # 🟢 開放科學
├── P2-academia/                   # 🟢 教授圈長尾
├── P2-substack/                   # 🟢 訂閱長期管道
├── P2-wikidata/                   # 🟢 AI 知識圖譜
├── P3-arxiv/                      # 🔵 量化金融（選做）
├── P3-google-scholar/             # 🔵 自動聚合
├── P3-airiti/                     # 🔵 台灣中文資料庫
├── P3-slideshare/                 # 🔵 簡報視覺化
├── _assets/                       # 共用素材
│   ├── abstract-zh.md             # 繁中 300 字摘要
│   ├── abstract-en.md             # 英文 250 字摘要
│   ├── author-bio.md              # 作者介紹（繁/英）
│   ├── citation-formats.md        # 7 種引用格式
│   ├── README-template.md         # GitHub README 範本
│   └── BCI_METHODOLOGY-source.md  # 完整方法論原文
└── _scripts/                      # 自動化腳本
    ├── open-all-links.sh          # 一鍵開所有提交頁
    ├── update-doi.sh              # 一鍵寫入 DOI
    ├── update-ssrn.sh             # 一鍵寫入 SSRN URL
    └── progress-checklist.sh      # 進度追蹤
```

## 每個平台資料夾的結構
- **LINK.md** — 直達連結（註冊 / 提交 / 設定頁）
- **SUBMIT.md** — 預填內容（複製貼上即可）
- **STEPS.md** — 操作步驟（含時間估算）

## 5 分鐘上手

```bash
# 1. 解壓縮到你的工作目錄
tar -xzf bci-publishing-kit.tar.gz
cd bci-publishing-kit

# 2. 看總覽
open 00-INDEX/README.md          # macOS
xdg-open 00-INDEX/README.md      # Linux

# 3. 一鍵開 P0 三個平台的提交頁
bash _scripts/open-all-links.sh P0

# 4. 照著 P0-github/STEPS.md → P0-zenodo/STEPS.md → P0-ssrn/STEPS.md 操作
# 預估總時間: 50 分鐘可完成 P0
```

## 拿到 Zenodo DOI 後

```bash
# 假設 DOI 是 10.5281/zenodo.12345678
bash _scripts/update-doi.sh 10.5281/zenodo.12345678

# 所有 SUBMIT.md / 引用格式自動更新，可直接複製貼上到後續平台
```

## 拿到 SSRN URL 後

```bash
bash _scripts/update-ssrn.sh https://ssrn.com/abstract=1234567
```

## 追蹤進度

```bash
bash _scripts/progress-checklist.sh
```

互動式 checklist，每完成一個平台勾一次。

---

## 給未來的自己（4 週後）

到第 30 天，回到這個資料夾執行:

```bash
bash _scripts/progress-checklist.sh
```

如果 15/15 都完成，到 `00-INDEX/AUTOMATION-GUIDE.md` 最下方執行 AI 索引驗證查詢腳本，確認 BCI 已進入 ChatGPT / Perplexity / Claude / Gemini 的索引。

完成那一刻，「Brand Capital Index」就正式成為一個 AI 引擎會引用的方法論名詞了。
