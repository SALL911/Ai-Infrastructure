/**
 * GA4 Event Tracking for Symcio Brand AI Audit MVP v2
 */

(function (root) {
  'use strict';

  function fire(name, params) {
    try {
      if (typeof root.gtag === 'function') {
        root.gtag('event', name, params || {});
      }
    } catch (e) { /* no-op */ }
  }

  const Analytics = {
    formStart: (industry) => fire('form_start', { industry }),
    formStep2: (industry) => fire('form_step2', { industry }),
    formSubmit: (industry, brand) => fire('form_submit', { industry, brand }),
    reportView: (brand, bci, tier) => fire('report_view', { brand, bci, tier }),
    pdfDownload: (brand) => fire('pdf_download', { brand }),
    pricingView: () => fire('pricing_view'),
    pricingClick: (plan) => fire('pricing_click', { plan }),
    discordClick: (where) => fire('discord_click', { where }),
    githubClick: (where) => fire('github_click', { where })
  };

  root.SymcioAnalytics = Analytics;
})(typeof window !== 'undefined' ? window : this);
