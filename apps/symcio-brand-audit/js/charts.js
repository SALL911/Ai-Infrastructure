/**
 * Chart renderers for Symcio Brand AI Audit report
 * ------------------------------------------------
 * Requires Chart.js 4.x loaded globally.
 */

(function (root) {
  'use strict';

  const DEFAULT_GRID = 'rgba(255, 255, 255, 0.08)';
  const TEXT_COLOR = '#9ca3af';

  function renderRadar(canvasId, result) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    return new Chart(el, {
      type: 'radar',
      data: {
        labels: ['財務品牌價值 (FBV)', '自然資本價值 (NCV)', 'AI 可見度 (AIV)'],
        datasets: [{
          label: result.brandName,
          data: [result.FBV, result.NCV, result.AIV],
          backgroundColor: 'rgba(200, 245, 90, 0.18)',
          borderColor: '#c8f55a',
          borderWidth: 2,
          pointBackgroundColor: '#c8f55a',
          pointBorderColor: '#0a0a0a',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed.r}/100`
            }
          }
        },
        scales: {
          r: {
            min: 0, max: 100,
            angleLines: { color: DEFAULT_GRID },
            grid: { color: DEFAULT_GRID },
            ticks: {
              color: TEXT_COLOR,
              backdropColor: 'transparent',
              stepSize: 20
            },
            pointLabels: {
              color: '#f5f5f5',
              font: { size: 13, weight: '600' }
            }
          }
        }
      }
    });
  }

  function renderCompetitorBar(canvasId, result) {
    const el = document.getElementById(canvasId);
    if (!el || typeof Chart === 'undefined') return null;
    const competitors = result.competitors || [];
    const labels = [result.brandName, ...competitors.map(c => c.name)];
    const scores = [result.AIV, ...competitors.map(c => c.score)];
    const colors = labels.map((_, i) => i === 0 ? '#c8f55a' : 'rgba(200, 200, 200, 0.35)');
    const borderColors = labels.map((_, i) => i === 0 ? '#c8f55a' : 'rgba(200, 200, 200, 0.55)');

    return new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: scores,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `AI 可見度：${ctx.parsed.x}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0, max: 100,
            grid: { color: DEFAULT_GRID },
            ticks: { color: TEXT_COLOR }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#f5f5f5', font: { size: 13, weight: '600' } }
          }
        }
      }
    });
  }

  root.SymcioCharts = { renderRadar, renderCompetitorBar };
})(typeof window !== 'undefined' ? window : this);
