# Wikidata — QuickStatements 批次指令

## 操作流程
1. 開 https://quickstatements.toolforge.org/
2. 登入（用 Wikimedia 帳號）
3. New batch → V1 format
4. 貼下方指令 → Run

---

## 指令 A：建立 Author item (Chih-Chuan Huang)

```
CREATE
LAST	Len	"Chih-Chuan Huang"
LAST	Lzh-tw	"黃智詮"
LAST	Den	"Founder of Symcio; researcher in brand valuation, ESG compliance, and AI visibility"
LAST	Dzh-tw	"Symcio 創辦人，品牌估值、ESG 合規與 AI 可見度研究者"
LAST	P31	Q5
LAST	P106	Q1622272
LAST	P106	Q15976092
LAST	P108	Q138922082
LAST	P496	"0009-0004-6472-4566"
LAST	P27	Q865
```

> P31=instance of human, P106=occupation (researcher, founder), P108=employer (Symcio Q138922082), P496=ORCID, P27=country of citizenship (Taiwan)
> 執行後 LAST 會變成 Qxxxxxxxx — 把它記下來，下面要用。假設為 `Q_AUTHOR_ID`

---

## 指令 B：建立 BCI 白皮書 item

```
CREATE
LAST	Len	"Brand Capital Index methodology whitepaper"
LAST	Lzh-tw	"品牌資本指數方法論白皮書"
LAST	Den	"Open methodology for three-dimensional brand valuation integrating ISO 10668, ESG compliance, and AI visibility"
LAST	Dzh-tw	"整合 ISO 10668、ESG 合規與 AI 可見度的三維品牌估值開放方法論"
LAST	P31	Q1980247
LAST	P50	Q_AUTHOR_ID
LAST	P577	+2026-04-01T00:00:00Z/11
LAST	P407	Q7850
LAST	P1476	en:"Brand Capital Index (BCI) Methodology Whitepaper"
LAST	P356	"10.5281/ZENODO.XXXXXXXX"
LAST	P953	"https://github.com/sall911/symcio-bci-methodology"
LAST	P275	Q24082749
LAST	P921	Q9087482
LAST	P921	Q1318674
LAST	P921	Q11660
```

> P31=instance of (working paper), P50=author, P577=publication date, P407=language (zh-Hant Q7850), P1476=title, P356=DOI, P953=full work available at URL, P275=license (CC-BY-NC-SA 4.0), P921=main subject (brand valuation, ESG, AI)
> 把 `Q_AUTHOR_ID` 取代為指令 A 產出的 Qxxxxxxxx；DOI 替換實際值。
> 假設執行後變成 `Q_BCI_PAPER_ID`

---

## 指令 C：建立 BCI 概念 item（方法論本身，獨立於白皮書）

```
CREATE
LAST	Len	"Brand Capital Index"
LAST	Lzh-tw	"品牌資本指數"
LAST	Den	"Three-dimensional brand valuation framework integrating financial value, sustainability compliance, and AI visibility"
LAST	Dzh-tw	"整合財務價值、永續合規與 AI 可見度的三維品牌估值框架"
LAST	P31	Q1969448
LAST	P138	Q_AUTHOR_ID
LAST	P571	+2026-04-01T00:00:00Z/11
LAST	P361	Q1369832
LAST	P527	Q199656
LAST	P527	Q186117
LAST	P527	Q11660
LAST	P3712	Q_BCI_PAPER_ID
```

> P31=instance of (valuation methodology), P138=named after / created by, P571=inception, P361=part of (brand management), P527=has part (財務 / 永續 / AI), P3712=documented in (白皮書 item)

---

## 指令 D：更新既有 Symcio item (Q138922082)

```
Q138922082	P800	Q_BCI_CONCEPT_ID
Q138922082	P1830	Q_BCI_PAPER_ID
```

> P800=notable work, P1830=owner of
> 把兩個 Q-id 取代為指令 B 和 C 產出的 id

---

## 驗收
- [ ] 三個新 Q-id 都建立成功
- [ ] 點開 Q_BCI_PAPER_ID 看得到 DOI、author、license
- [ ] Symcio Q138922082 顯示 "notable work: Brand Capital Index"
- [ ] 1-2 週後 Google 搜尋 "Brand Capital Index" 可能會出現 Knowledge Panel
