# Symcio BrandOS — Design System v1

> 對應 Tailwind 設定：`web/landing/tailwind.config.ts`
> 對應全域樣式：`web/landing/app/globals.css`
> 設計語彙：**專業、精準、B2B**；夜間可讀、低色彩飽和、單一強調色。

---

## 一、色票（Color Tokens）

### 主色系

| Token | Hex | 用途 |
|-------|-----|------|
| `ink` | `#0a0a0a` | 主背景；按鈕文字（在 accent 上）|
| `surface` | `#111111` | 卡片 / 區塊背景 |
| `surface-2` | `#161616` | 卡片內 hover / 更深層 |
| `line` | `#262626` | 標準邊框 |
| `line-soft` | `#2a2a2a` | 輸入框、軟邊框 |
| `accent` | `#c8f55a` | 品牌色（CTA、link、重點）|
| `accent-dim` | `#a8d140` | accent hover / pressed |

### 語意色（Tier Colors — BCI 對應）

| Token | Hex | 語意 | BCI 分數範圍 |
|-------|-----|------|------------|
| `excellent` | `#2dd4a0` | 優秀 / 成功 | 80–100 |
| `good` | `#378ADD` | 良好 / 資訊 | 60–79 |
| `warning` | `#fbbf24` | 需改善 / 注意 | 40–59 |
| `danger` | `#f87171` | 危險 / 錯誤 | 0–39 |

### 文字色

| Token | Hex | 用途 |
|-------|-----|------|
| `text`（預設 Tailwind `white`）| `#ffffff` | 主要文字 |
| `#f5f5f5` | | 在深色卡片上的標題 |
| `muted` | `#9ca3af` | 次要文字 |
| `muted-dim` | `#6b7280` | 註釋、hint |

---

## 二、字型（Typography）

### 字族

```css
font-sans: "Inter", "-apple-system", "BlinkMacSystemFont", "Noto Sans TC", sans-serif;
font-mono: "DM Mono", "Menlo", "SFMono-Regular", monospace;
```

兩者均走 Google Fonts CDN（`app/layout.tsx` 載入）。

### 字重 · 字級 · 用途對照

| Tailwind class | px | weight | 用途 |
|----------------|-----|--------|------|
| `text-5xl font-extrabold` | 48 | 800 | Hero H1 |
| `text-4xl font-extrabold` | 36 | 800 | Page H1 |
| `text-3xl font-bold` | 30 | 700 | Section H2 |
| `text-2xl font-bold` | 24 | 700 | Component heading |
| `text-xl font-bold` | 20 | 700 | Card title |
| `text-lg font-semibold` | 18 | 600 | Emphasis body |
| `text-base` | 16 | 400 | Body copy |
| `text-sm text-muted` | 14 | 400 | Secondary |
| `text-xs font-mono uppercase tracking-[0.25em] text-accent` | 12 | 400 | Eyebrow / section label |

### 行高

- 標題：`leading-tight` (1.25) 或 `leading-[1.15]`
- 正文：`leading-relaxed` (1.625)
- 長敘述（FAQ 答案）：`leading-[1.8]`

---

## 三、間距與容器

### 容器寬度

| 場景 | max-width | 用法 |
|------|-----------|------|
| 主容器 | `max-w-6xl` (1152px) | 頁面主結構 |
| 閱讀寬度 | `max-w-4xl` (896px) | 長文、FAQ |
| 表單 | `max-w-2xl` (672px) | 登入 / 診斷表單 |
| 敘事窄版 | `max-w-3xl` (768px) | 平衡的敘事 |
| Hero（narrow） | `max-w-3xl` | Hero subtitle 用 |

### 節奏（vertical rhythm）

- 區塊 section 垂直 padding：`py-16` 或 `py-20`（桌面）
- 區塊之間靠 `border-b border-line` 視覺分段
- 段落之間：`mt-6` / `mt-8` / `mt-10`
- 元件內：`mt-3` / `mt-4`

---

## 四、圓角 · 邊框 · 陰影

| 元素 | token |
|------|-------|
| 卡片 / 按鈕 | `rounded-card`（12px）|
| 輸入框 | `rounded-lg`（8px）|
| Logo 方塊 | `rounded-lg`（8px）|
| 標籤 chip / badge | `rounded-full` |
| 圓環 / avatar | `rounded-full` |
| 邊框 | `border border-line` 或 `border-line-soft` |
| 強調邊 | `border-l-2 border-accent` |

**刻意不使用**：`shadow-*`。設計語彙走 flat 風格，靠邊框而非陰影區分層次。例外：mobile 登入表單卡片可加 `backdrop-blur`。

---

## 五、元件模式

### Button

```tsx
// Primary（品牌色主按鈕）
<button className="rounded-card bg-accent px-7 py-3.5 text-sm font-bold text-ink hover:scale-[1.02] transition">
  免費品牌 AI 健檢 →
</button>

// Secondary（邊框）
<button className="rounded-card border border-line-soft px-7 py-3.5 text-sm font-bold text-white hover:border-accent hover:text-accent">
  Discord 社群
</button>

// Tertiary（文字連結）
<a className="font-mono text-xs text-accent no-underline hover:underline">
  查看完整方案 →
</a>
```

### Card

```tsx
<div className="rounded-card border border-line bg-surface p-6 transition hover:border-accent">
  <div className="font-mono text-[11px] uppercase tracking-[2px] text-muted">LABEL</div>
  <h3 className="mt-2 text-xl font-bold">Heading</h3>
  <p className="mt-3 text-sm leading-relaxed text-muted">Body copy...</p>
</div>
```

### Badge / Pill

```tsx
// Tier badge
<span className="rounded-full bg-excellent px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
  優秀
</span>

// Feature badge（在卡片右上角）
<span className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[1px] text-ink">
  最受歡迎
</span>
```

### Eyebrow（區塊標籤）

一致的視覺慣例 — 每個 section 的小字標籤：

```tsx
<p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
  Brand Capital Index
</p>
```

### Input

```tsx
<input className="w-full rounded-lg border border-line-soft bg-ink px-3.5 py-3 text-[15px] text-white focus:border-accent focus:outline-none" />
```

### Data bar（AI engine score）

```tsx
<div className="flex items-center gap-3">
  <div className="w-28 text-sm font-semibold">ChatGPT</div>
  <div className="h-5 flex-1 overflow-hidden rounded-full bg-line">
    <div className="h-full transition-[width] duration-1000" style={{ width: `${score}%`, background: '#2dd4a0' }} />
  </div>
  <div className="w-12 text-right font-mono text-sm font-bold">{score}</div>
</div>
```

---

## 六、動效（Motion）

| 情境 | 類別 |
|------|------|
| Button hover | `transition hover:scale-[1.02]` |
| Card hover | `transition hover:translate-y-[-2px]` 或 `hover:border-accent` |
| Bar 長度填充 | `transition-[width] duration-1000 ease-out` |
| Icon pulse（診斷動畫） | `animate-spin-slow`（自訂 keyframe）|
| Details 切換 | group-open rotate 45° |

**不用**：大幅位移、淡入、滑入、視差。設計語彙走「資訊即時可見」，不搞 scroll-triggered drama。

---

## 七、RWD 斷點

使用 Tailwind 標準：

| 斷點 | px | 常用 |
|------|-----|------|
| `sm:` | 640 | 小手機 |
| `md:` | 768 | 平板（主要切換點）|
| `lg:` | 1024 | 桌面 |
| `xl:` | 1280 | 大螢幕（少用）|

典型樣式：
```tsx
// 手機堆疊、平板以上並排
<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

// 標題尺寸漸進
<h1 className="text-4xl md:text-5xl">

// Nav 在手機收到漢堡
<nav className="hidden md:flex">
<button className="md:hidden">Hamburger</button>
```

---

## 八、圖表主題（Chart.js）

定義在 `web/landing/components/AuditReport.tsx`：

```ts
const DEFAULT_GRID = 'rgba(255, 255, 255, 0.08)';
const TEXT_COLOR = '#9ca3af';

radar: {
  backgroundColor: 'rgba(200, 245, 90, 0.18)',  // accent @ 18% alpha
  borderColor: '#c8f55a',
  pointBackgroundColor: '#c8f55a',
  pointBorderColor: '#0a0a0a',
}

bar: {
  // 自己的品牌 = accent 實色
  // 競品 = 灰色漸層 rgba(200,200,200,0.35)
}
```

---

## 九、圖示（Icons）

**優先**：emoji（繁中 + 英語 UI 通用、無授權問題、零載入成本）
- 🎯 / 📊 / 🔓 / 💬 / 🐙 / 📚

**次要**：inline SVG（Google icon、logo mark）

**不用**：icon font（Font Awesome 等）— 額外請求、授權複雜。

---

## 十、無障礙（A11y）

- 所有互動 element 有 focus ring（`focus:border-accent focus:outline-none`）
- `aria-label` / `aria-expanded` 於漢堡按鈕、展開元件
- 色彩對比：主背景 `#0a0a0a` 上的 `text-muted #9ca3af` = 4.9:1（AA 通過）
- 表單標籤都有對應 `<label>` 綁定
- heading 階層 h1 → h2 → h3 不跳級

---

## 十一、不做什麼（刻意邊界）

- ❌ 不用 gradient 背景（看起來不專業）
- ❌ 不用 blur glass（SaaS 陳腔濫調）
- ❌ 不用動效 scroll-triggered reveals
- ❌ 不用多強調色（只有一個 accent `#c8f55a`）
- ❌ 不在按鈕上加 border radius < 12px（視覺統一）
- ❌ 不用 serif 字型
- ❌ 不用 warm 色（橘、紅）作主色，只做 danger / warning 語意
