/**
 * PDF report generator using html2pdf.js (loaded from CDN in report.html).
 * Builds the report HTML inside #pdf-content, renders to A4 PDF.
 */

(function (root) {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function buildPdfContent(result) {
    const { brandName, industry, BCI, FBV, NCV, AIV,
      chatgptScore, perplexityScore, googleAIScore, claudeScore,
      geoChecks, geoScore, recommendations, competitors } = result;
    const tier = root.SymcioScoring.bciTier(BCI);

    const geoList = [
      ['Schema.org 結構化資料', geoChecks.schemaOrg],
      ['Wikidata 品牌實體',    geoChecks.wikidata],
      ['Google Knowledge Panel', geoChecks.knowledgePanel],
      ['LinkedIn 公司頁面',    geoChecks.linkedin],
      ['SSL 憑證',             geoChecks.ssl]
    ];
    const geoRows = geoList.map(([name, ok]) =>
      `<tr><td>${name}</td><td>${ok ? '✓ 通過' : '✗ 待優化'}</td></tr>`
    ).join('');

    const compRows = [[brandName, AIV], ...competitors.map(c => [c.name, c.score])]
      .sort((a, b) => b[1] - a[1])
      .map(([n, s]) => `<tr><td>${n}${n === brandName ? ' <b>(您的品牌)</b>' : ''}</td><td>${s}/100</td></tr>`)
      .join('');

    const recRows = recommendations.map((r, i) =>
      `<div style="margin-bottom:16px;padding:12px;border-left:3px solid #c8f55a;">
         <div style="font-size:11px;font-weight:700;color:#666;margin-bottom:4px;">優先度：${r.priority}</div>
         <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${i + 1}. ${r.title}</div>
         <div style="font-size:13px;color:#333;margin-bottom:6px;">${r.desc}</div>
         <div style="font-size:12px;color:#0a0a0a;"><b>行動建議：</b>${r.action}</div>
       </div>`
    ).join('');

    return `
      <div class="pdf-cover">
        <div style="font-size:48px;font-weight:800;color:#0a0a0a;margin-bottom:8px;">SYMCIO</div>
        <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#666;margin-bottom:64px;">Brand AI Audit</div>
        <h1 style="font-size:28px;font-weight:700;margin-bottom:24px;">品牌 AI 可見度診斷報告</h1>
        <div style="font-size:22px;font-weight:600;margin-bottom:8px;">${brandName}</div>
        <div style="color:#666;font-size:14px;">${industry} · 報告日期 ${dateStr()}</div>
        <div style="margin-top:100px;padding:20px;border:1px solid #ccc;">
          <div style="font-size:12px;color:#666;letter-spacing:1px;">BCI TOTAL SCORE</div>
          <div style="font-size:64px;font-weight:700;color:#0a0a0a;">${BCI}<span style="font-size:24px;color:#666;">/100</span></div>
          <div style="font-size:16px;color:#666;">評等：${tier.label}</div>
        </div>
      </div>

      <div class="pdf-page">
        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin-bottom:16px;">一、BCI 三維分析</h2>
        <table>
          <thead><tr><th>維度</th><th>分數</th><th>說明</th></tr></thead>
          <tbody>
            <tr><td>FBV · 財務品牌價值</td><td>${FBV}/100</td><td>依循 ISO 10668 財務法精神；整合營收、規模、品牌角色與強度。</td></tr>
            <tr><td>NCV · 自然資本價值</td><td>${NCV}/100</td><td>基於 TNFD LEAP 框架；反映產業自然依賴度與 biocredit 潛力。</td></tr>
            <tr><td>AIV · AI 可見度價值</td><td>${AIV}/100</td><td>跨 ChatGPT / Perplexity / Google AI / Claude 的加權提及率。</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pdf-page">
        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin-bottom:16px;">二、四大 AI 引擎分數</h2>
        <table>
          <thead><tr><th>引擎</th><th>可見度分數</th><th>AIV 權重</th></tr></thead>
          <tbody>
            <tr><td>ChatGPT</td><td>${chatgptScore}/100</td><td>35%</td></tr>
            <tr><td>Perplexity</td><td>${perplexityScore}/100</td><td>25%</td></tr>
            <tr><td>Google AI Overviews</td><td>${googleAIScore}/100</td><td>25%</td></tr>
            <tr><td>Claude</td><td>${claudeScore}/100</td><td>15%</td></tr>
          </tbody>
        </table>

        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin:24px 0 16px;">三、GEO 基礎建設檢查（${geoScore}/5）</h2>
        <table>
          <thead><tr><th>項目</th><th>狀態</th></tr></thead>
          <tbody>${geoRows}</tbody>
        </table>
      </div>

      <div class="pdf-page">
        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin-bottom:16px;">四、同產業競品 AI 可見度比較</h2>
        <table>
          <thead><tr><th>品牌</th><th>AI 可見度</th></tr></thead>
          <tbody>${compRows}</tbody>
        </table>
      </div>

      <div class="pdf-page">
        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin-bottom:16px;">五、改善建議與行動計畫</h2>
        ${recRows}
      </div>

      <div class="pdf-page" style="page-break-after:auto;">
        <h2 style="font-size:18px;border-bottom:2px solid #0a0a0a;padding-bottom:6px;margin-bottom:16px;">六、關於 Symcio</h2>
        <p style="font-size:13px;color:#333;margin-bottom:12px;">
          Symcio（全識）是台灣第一個 AI 曝光可量化系統。BCI 方法論依循 ISO 10668 國際品牌評價標準，整合：
        </p>
        <ul style="font-size:13px;color:#333;padding-left:20px;line-height:1.8;">
          <li>Interbrand 財務品牌估值精神（FBV）</li>
          <li>TNFD LEAP 自然資本框架（NCV）</li>
          <li>Symcio 獨創跨四引擎 AI 可見度（AIV）</li>
        </ul>
        <h3 style="font-size:14px;margin-top:20px;margin-bottom:8px;">建議下一步：</h3>
        <ul style="font-size:13px;color:#333;padding-left:20px;line-height:1.8;">
          <li>免費版：Entity Builder 工具 + Discord 社群</li>
          <li>專業版：每月完整報告 + 四引擎追蹤 · NTD 100,000/年</li>
          <li>企業版：BCI API + ESG/TNFD 自動化 · NTD 250,000–500,000/年</li>
        </ul>
        <p style="margin-top:24px;font-size:12px;">
          聯絡：<b>sall@symcio.tw</b><br>
          Discord：discord.gg/jGWJr2Sd<br>
          GitHub：github.com/sall911/symcio
        </p>
        <div class="footer">
          本報告由 Symcio Brand Capital Index (BCI) 方法論生成 · 依循 ISO 10668 · CONFIDENTIAL
        </div>
      </div>
    `;
  }

  function download(result) {
    if (typeof html2pdf === 'undefined') {
      alert('PDF 生成模組尚未載入，請稍候再試。');
      return;
    }
    const container = document.getElementById('pdf-content');
    if (!container) return;
    container.innerHTML = buildPdfContent(result);

    const filename = `${result.brandName}_AI品牌可見度報告_${dateStr()}.pdf`;
    const opt = {
      margin: [12, 12, 12, 12],
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    if (root.SymcioAnalytics) root.SymcioAnalytics.pdfDownload(result.brandName);
    html2pdf().set(opt).from(container).save();
  }

  root.SymcioPDF = { download, buildPdfContent };
})(typeof window !== 'undefined' ? window : this);
