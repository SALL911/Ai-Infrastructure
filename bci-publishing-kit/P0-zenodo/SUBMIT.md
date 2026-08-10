# Zenodo 預填 Metadata

## 上傳路徑
**選 GitHub 整合**（推薦）→ 自動從 Release 抓取
或**手動上傳** PDF → https://zenodo.org/uploads/new

---

## Metadata（逐欄複製貼上）

### Upload type
```
Publication → Working paper
```

### Basic information

**DOI**:
```
(留空，讓 Zenodo 自動配發)
```

**Publication date**:
```
2026-04-01
```

**Title**:
```
Brand Capital Index (BCI) Methodology Whitepaper: Integrating Financial Brand Value, Sustainability Compliance Value, and AI Visibility Value
```

**Creators**:
```
Family name: Huang
Given names: Chih-Chuan
Affiliation: Symcio Co., Ltd.
ORCID: 0009-0004-6472-4566
```

**Description (HTML allowed)**:
```html
<p>This whitepaper proposes the <strong>Brand Capital Index (BCI)</strong>, an open methodology that extends brand valuation from a single financial dimension to a three-dimensional time-series indicator.</p>

<p>The BCI formula is: <code>BCI = α·FBV + β·SCV + γ·AIV</code>, where α + β + γ = 1 and BCI ∈ [0,100]. The three components are:</p>

<ul>
  <li><strong>FBV (Financial Brand Value)</strong> — brand contribution to corporate earnings, calculated using the ISO 10668:2010 income approach.</li>
  <li><strong>SCV (Sustainability Compliance Value)</strong> — regulatory-risk-adjusted value integrating ISSB S1/S2, TNFD, EU CSRD, and Taiwan FSC phased ESG disclosure rules.</li>
  <li><strong>AIV (AI Visibility Value)</strong> — brand citation rate and position score across ChatGPT, Gemini, Perplexity, and Claude.</li>
</ul>

<p>BCI addresses two structural blind spots of legacy valuation: (1) mandatory sustainability regulation has become a market-access determinant, and (2) generative AI platforms have become a primary brand-discovery channel (>30% consumer penetration as of 2025).</p>

<p>Preliminary validation on 30 Taiwan-listed companies shows BCI explains 15–20% more subsequent revenue variation than single-dimension FBV alone, and detects brand capital impairment signals 1–2 quarters earlier.</p>

<p>The methodology is published under CC BY-NC-SA 4.0, is designed to be globally applicable and regulation-neutral, and ships with a governance scaffold (weight calibration, audit trail, version control).</p>
```

### License
```
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)
```

### Communities
```
(可不填，或申請加入 "Open Access Research" / "Sustainability")
```

### Keywords (one per line)
```
brand valuation
ISO 10668
ESG compliance
AI visibility
generative engine optimization
brand governance
ISSB
TNFD
brand capital
sustainability
Taiwan
working paper
```

### Language
```
Chinese (zho)
```

### Additional notes
```
Author affiliation: Symcio Co., Ltd., Taipei, Taiwan
Author ORCID: https://orcid.org/0009-0004-6472-4566
GitHub repository: https://github.com/sall911/symcio-bci-methodology
```

### Related/alternate identifiers
| Relation | Identifier |
|----------|------------|
| is supplemented by | https://github.com/sall911/symcio-bci-methodology |
| is documented by | https://github.com/sall911/symcio-bci-methodology/blob/main/README.md |

### Funding
```
(無，留空)
```

---

## 發布後立即執行
1. 複製產生的 DOI（格式: `10.5281/zenodo.XXXXXXXX`）
2. 回 GitHub repo 更新 README.md 加入 Zenodo badge:
   ```markdown
   [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXXX)
   ```
3. 更新 `CITATION.cff` 的 `doi:` 欄位
4. 在 `_assets/citation-formats.md` 把所有 `[DOI_PENDING]` 取代為實際 DOI
