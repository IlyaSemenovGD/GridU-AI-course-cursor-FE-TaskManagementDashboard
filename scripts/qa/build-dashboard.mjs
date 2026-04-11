#!/usr/bin/env node
/**
 * Static HTML quality dashboard from qa-reports/summary.json
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

async function main() {
  await mkdir(outDir, { recursive: true })
  let summary = {}
  if (existsSync(summaryPath)) {
    summary = JSON.parse(await readFile(summaryPath, 'utf8'))
  }

  const rows = [
    ['Frontend unit tests', summary.frontend?.vitest],
    ['Frontend coverage (lines %)', summary.frontend?.coverage?.lines],
    ['ESLint problems (count)', summary.frontend?.eslint?.problems],
    ['Backend coverage (%)', summary.backend?.pytestCoverage?.percent_covered],
    ['Pylint score (/10)', summary.backend?.pylint?.score],
    ['k6 http_req_failed rate', summary.performance?.k6?.http_req_failed],
    ['Lighthouse performance', summary.performance?.lighthouse?.summary?.performance],
    ['ZAP (alerts count)', summary.security?.zap?.alerts],
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QA dashboard — Task Management</title>
  <style>
    :root { font-family: system-ui, sans-serif; background: #0f1419; color: #e6edf3; }
    body { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
    h1 { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border: 1px solid #30363d; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #161b22; }
    code { font-size: 0.85rem; word-break: break-all; }
    section { margin-top: 2rem; }
    .json { background: #161b22; padding: 1rem; overflow: auto; border-radius: 8px; font-size: 0.8rem; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <h1>Quality report</h1>
  <p>Generated: <strong>${esc(summary.generatedAt)}</strong></p>
  <h2>Key metrics</h2>
  <table>
    <thead><tr><th>Metric</th><th>Value</th></tr></thead>
    <tbody>${table}</tbody>
  </table>
  <section>
    <h2>AI &amp; heuristic recommendations</h2>
    ${aiHtml}
  </section>
  <section>
    <h2>Raw summary (JSON)</h2>
    <pre class="json">${esc(JSON.stringify(summary, null, 2))}</pre>
  </section>
  <p>Artifacts: Vitest, pytest coverage, ESLint JSON, Pylint, Lighthouse, k6, ZAP (when run in CI).</p>
</body>
</html>`

  await writeFile(join(outDir, 'index.html'), html, 'utf8')
  console.log('Wrote', join(outDir, 'index.html'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
