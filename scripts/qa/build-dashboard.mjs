#!/usr/bin/env node
/**
 * Static HTML quality dashboard from qa-reports/summary.json
 * — metrics table, Chart.js bar/radar charts, raw JSON, AI block.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'qa-reports', 'dashboard')
const summaryPath = join(root, 'qa-reports', 'summary.json')

function esc(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

async function main() {
  await mkdir(outDir, { recursive: true })
  let summary = {}
  if (existsSync(summaryPath)) {
    summary = JSON.parse(await readFile(summaryPath, 'utf8'))
  }

  const rows = [
    ['Frontend unit tests (Vitest)', summary.frontend?.vitest],
    ['Frontend coverage — lines %', summary.frontend?.coverage?.lines],
    ['ESLint problems', summary.frontend?.eslint?.problems],
    ['Backend coverage %', summary.backend?.pytestCoverage?.percent_covered],
    ['Pylint score /10', summary.backend?.pylint?.score],
    ['Playwright E2E (JUnit)', summary.e2e?.playwright],
    ['k6 http_req_failed rate', summary.performance?.k6?.http_req_failed],
    ['Lighthouse performance', summary.performance?.lighthouse?.summary?.performance],
    ['ZAP alert groups', summary.security?.zap?.alerts],
  ]

  const table = rows
    .map(
      ([k, v]) =>
        `<tr><td>${esc(k)}</td><td><code>${esc(JSON.stringify(v ?? '—'))}</code></td></tr>`,
    )
    .join('\n')

  let aiHtml = '<p><em>No AI recommendations file found.</em></p>'
  const aiPath = join(root, 'qa-reports', 'ai-recommendations.html')
  if (existsSync(aiPath)) {
    aiHtml = await readFile(aiPath, 'utf8')
  }

  const summaryJson = JSON.stringify(summary)
  const feLines = num(summary.frontend?.coverage?.lines, 0)
  const beCov = num(summary.backend?.pytestCoverage?.percent_covered, 0)
  const lhPerf = num(summary.performance?.lighthouse?.summary?.performance, 0) * 100
  const pylint = num(summary.backend?.pylint?.score, 0) * 10

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA dashboard — Task Management</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" crossorigin="anonymous"></script>
  <style>
    :root { font-family: system-ui, sans-serif; background: #0f1419; color: #e6edf3; }
    body { max-width: 1100px; margin: 2rem auto; padding: 0 1rem 3rem; }
    h1 { font-weight: 600; }
    h2 { font-size: 1.1rem; margin-top: 2rem; color: #8b949e; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #30363d; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #161b22; }
    code { font-size: 0.85rem; word-break: break-all; }
    section { margin-top: 1.5rem; }
    .json { background: #161b22; padding: 1rem; overflow: auto; border-radius: 8px; font-size: 0.8rem; max-height: 320px; }
    a { color: #58a6ff; }
    .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; }
    @media (max-width: 800px) { .charts { grid-template-columns: 1fr; } }
    .chart-wrap { background: #161b22; border-radius: 12px; padding: 1rem; border: 1px solid #30363d; }
    .chart-wrap canvas { max-height: 280px; }
    .links { margin-top: 1rem; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Quality report</h1>
  <p>Generated: <strong>${esc(summary.generatedAt)}</strong></p>

  <h2>Metrics visualization</h2>
  <div class="charts">
    <div class="chart-wrap">
      <canvas id="chartCoverage" aria-label="Coverage bars"></canvas>
    </div>
    <div class="chart-wrap">
      <canvas id="chartRadar" aria-label="Quality radar"></canvas>
    </div>
  </div>

  <h2>Key metrics</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${table}</tbody>
  </table>

  <p class="links">Local artifacts: <code>qa-reports/</code> — Vitest, pytest, ESLint JSON, Pylint, Lighthouse, k6, ZAP, Playwright JUnit + HTML under <code>qa-reports/playwright-report/</code>.</p>

  <section>
    <h2>AI &amp; heuristic recommendations</h2>
    ${aiHtml}
  </section>
  <section>
    <h2>Raw summary (JSON)</h2>
    <pre class="json">${esc(JSON.stringify(summary, null, 2))}</pre>
  </section>

  <script>
    const S = ${summaryJson};
    const fe = ${feLines};
    const be = ${beCov};
    const lh = ${lhPerf};
    const py = ${pylint};

    const covCtx = document.getElementById('chartCoverage');
    if (covCtx && typeof Chart !== 'undefined') {
      new Chart(covCtx, {
        type: 'bar',
        data: {
          labels: ['Frontend lines %', 'Backend stmt %', 'Lighthouse perf ×100', 'Pylint ×10'],
          datasets: [{
            label: 'Score / scale',
            data: [fe, be, lh, py],
            backgroundColor: ['#58a6ff', '#3fb950', '#d29922', '#a371f7'],
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#e6edf3' } } },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
            x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
          },
        },
      });
    }

    const radCtx = document.getElementById('chartRadar');
    if (radCtx && typeof Chart !== 'undefined') {
      const e2e = S.e2e?.playwright;
      const failRate = e2e && e2e.tests > 0
        ? Math.min(100, ((e2e.failures + e2e.errors) / e2e.tests) * 100)
        : 0;
      const passApprox = Math.max(0, 100 - failRate);
      new Chart(radCtx, {
        type: 'radar',
        data: {
          labels: ['FE cov', 'BE cov', 'Lighthouse', 'Pylint', 'E2E pass approx'],
          datasets: [{
            label: 'Quality (0–100)',
            data: [
              Math.min(100, fe),
              Math.min(100, be),
              Math.min(100, lh),
              Math.min(100, py),
              passApprox,
            ],
            backgroundColor: 'rgba(88, 166, 255, 0.2)',
            borderColor: '#58a6ff',
            pointBackgroundColor: '#58a6ff',
          }],
        },
        options: {
          responsive: true,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: { color: '#8b949e', backdropColor: 'transparent' },
              grid: { color: '#30363d' },
              pointLabels: { color: '#e6edf3' },
            },
          },
          plugins: { legend: { labels: { color: '#e6edf3' } } },
        },
      });
    }
  </script>
</body>
</html>`

  await writeFile(join(outDir, 'index.html'), html, 'utf8')
  console.log('Wrote', join(outDir, 'index.html'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
