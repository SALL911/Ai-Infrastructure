"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Radar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

/**
 * Side-by-side InterBrand Brand Strength × Symcio BCI radar.
 *
 * Same 5 axes (the dimensions that map cleanly across both methodologies),
 * scored 0–100 conceptually. Numbers are illustrative — they show
 * COVERAGE, not real measurements:
 *   - InterBrand: traditional 2010s strengths (clarity, presence on legacy
 *     channels) — high on AdTech / Social / PR, low on AI generative
 *   - BCI: AI-era coverage — strong on AI engine visibility + nature
 *     capital + cross-engine, gap on legacy media presence
 */

const AXES = [
  "Web/SEO Visibility",
  "AI Engine Recommendation",
  "Financial Capital",
  "Nature Capital (TNFD)",
  "Daily Time Series",
];

// Illustrative coverage scores — for narrative diagram, not real measurement
const INTERBRAND_BSS = [70, 25, 60, 35, 20];
const SYMCIO_BCI    = [55, 95, 80, 75, 95];

export function MethodologyComparison() {
  const data = useMemo(
    () => ({
      labels: AXES,
      datasets: [
        {
          label: "InterBrand Brand Strength Score",
          data: INTERBRAND_BSS,
          backgroundColor: "rgba(156, 163, 175, 0.18)",
          borderColor: "#9ca3af",
          borderWidth: 2,
          pointBackgroundColor: "#9ca3af",
          pointBorderColor: "#0a0a0a",
          pointRadius: 4,
        },
        {
          label: "Symcio BCI",
          data: SYMCIO_BCI,
          backgroundColor: "rgba(200, 245, 90, 0.18)",
          borderColor: "#c8f55a",
          borderWidth: 2,
          pointBackgroundColor: "#c8f55a",
          pointBorderColor: "#0a0a0a",
          pointRadius: 5,
        },
      ],
    }),
    [],
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#f5f5f5",
          font: { size: 12, weight: 600 as const },
          boxWidth: 14,
          padding: 14,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { r: number } }) =>
            `${ctx.dataset.label ?? ""}: ${ctx.parsed.r}/100 coverage`,
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        angleLines: { color: "rgba(255,255,255,0.08)" },
        grid: { color: "rgba(255,255,255,0.08)" },
        ticks: {
          color: "#9ca3af",
          backdropColor: "transparent",
          stepSize: 25,
          showLabelBackdrop: false,
        },
        pointLabels: {
          color: "#f5f5f5",
          font: { size: 12, weight: 500 as const },
        },
      },
    },
  };

  return (
    <div className="rounded-card border border-line bg-surface p-6 md:p-8">
      <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[2px] text-accent">
            方法論對照
          </p>
          <h3 className="mt-3 text-2xl font-extrabold leading-tight md:text-3xl">
            InterBrand 量品牌價值
            <br />
            BCI 量「AI 時代」的品牌資本
          </h3>
          <ul className="mt-5 space-y-3 text-sm text-muted">
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-muted" />
              <span>
                <b className="text-white">InterBrand Brand Strength Score</b>{" "}
                成熟於 2010 年代，10 因子主要靠消費者調研與媒體監測 — 它在
                AdTech / Social / PR 維度覆蓋強，但缺生成式 AI 通路與自然資本軸。
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
              <span>
                <b className="text-white">Symcio BCI</b> 把焦點放在
                AI 引擎推薦率、跨四引擎時序、TNFD 自然資本 — 對 InterBrand 缺的
                AI 時代維度補齊，並提供每日時序而非年度快照。
              </span>
            </li>
          </ul>
          <p className="mt-5 font-mono text-[11px] leading-relaxed text-muted-dim">
            * 圖表為**方法論覆蓋度示意**而非實際分數。InterBrand BSS 為
            Interbrand Corp. 註冊商標，本對照僅作 nominative fair use。
          </p>
        </div>

        <div className="h-[420px]">
          <Radar data={data} options={options} />
        </div>
      </div>
    </div>
  );
}
