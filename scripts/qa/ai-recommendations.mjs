#!/usr/bin/env node
/**
 * Heuristic QA recommendations + optional OpenAI enhancement (OPENAI_API_KEY).
 * Writes qa-reports/ai-recommendations.md and ai-recommendations.html
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const summaryPath = join(root, 'qa-reports', 'summary.json')
const outMd = join(root, 'qa-reports', 'ai-recommendations.md')
const outHtml = join(root, 'qa-reports', 'ai-recommendations.html')

function heuristics(s) {
  const lines = []
  const lc = s.frontend?.coverage?.lines
  if (lc != null && lc < 70) lines.push(`Frontend line coverage is ${lc}%; aim for 70%+ on critical paths.`)
  if (s.frontend?.eslint?.problems > 0) {
    lines.push(`ESLint reported ${s.frontend.eslint.problems} problem(s); fix errors first, then warnings.`)
  }
  if (s.frontend?.vitest && !s.frontend.vitest.success) {
    lines.push('Frontend unit tests failed; unblock the pipeline before merging.')
  }
  const pc = s.backend?.pytestCoverage?.percent_covered
  if (pc != null && pc < 60) lines.push(`Backend statement coverage is ${pc}%; add tests for services and API edge cases.`)
  const ps = s.backend?.pylint?.score
  if (ps != null && ps < 8) lines.push(`Pylint score is ${ps}/10; refactor modules with the most warnings and reduce complexity.`)
  const k6f = s.performance?.k6?.http_req_failed
  if (k6f != null && k6f > 0.02) lines.push(`k6 shows elevated http_req_failed (${k6f}); inspect API stability under load.`)
  const perf = s.performance?.lighthouse?.summary?.performance
  if (perf != null && perf < 0.5) lines.push('Lighthouse performance score is low; audit bundle size, images, and long tasks.')
  const zap = s.security?.zap?.alerts
  if (zap != null && zap > 0) lines.push(`OWASP ZAP reported ${zap} alert group(s); triage high/critical items.`)
  const pw = s.e2e?.playwright
  if (pw && pw.tests > 0 && pw.failures + pw.errors > 0) {
    lines.push(
      `Playwright E2E: ${pw.failures + pw.errors} failed/errored of ${pw.tests} tests; see qa-reports/playwright-report and Page Objects under e2e/pages/.`,
    )
  }
  if (lines.length === 0) lines.push('No major red flags in aggregated metrics; keep monitoring coverage and response times.')
  return lines
}

async function openaiEnhance(summary) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are a senior QA automation engineer. Given JSON QA metrics, respond with 6-10 short bullet points of concrete improvements. No markdown title; start each line with "- ".',
      },
      {
        role: 'user',
        content: JSON.stringify(summary),
      },
    ],
    temperature: 0.4,
    max_tokens: 900,
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`OpenAI HTTP ${res.status}: ${t}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || null
}

async function main() {
  await mkdir(join(root, 'qa-reports'), { recursive: true })
  let summary = {}
  if (existsSync(summaryPath)) {
    summary = JSON.parse(await readFile(summaryPath, 'utf8'))
  }

  const base = heuristics(summary)
  let md = '# QA improvement recommendations\n\n## Heuristics\n\n'
  md += base.map((l) => `- ${l}`).join('\n') + '\n\n'

  let aiText = null
  try {
    aiText = await openaiEnhance(summary)
  } catch (e) {
    md += `\n## AI (OpenAI)\n\n_Skipped or failed: ${e.message}_\n`
  }

  if (aiText) {
    md += '## AI (OpenAI)\n\n' + aiText + '\n'
  }

  await writeFile(outMd, md, 'utf8')

  const bulletsHtml = base.map((l) => `<li>${escapeHtml(l)}</li>`).join('')
  const aiHtml = aiText
    ? `<h3>AI (OpenAI)</h3><pre class="ai">${escapeHtml(aiText)}</pre>`
    : '<p><em>AI: set OPENAI_API_KEY in CI secrets to enable GPT suggestions.</em></p>'

  const html = `<section class="recs"><h3>Heuristics</h3><ul>${bulletsHtml}</ul>${aiHtml}</section>
<style>.recs .ai { white-space: pre-wrap; background:#161b22; padding:1rem; border-radius:8px; }</style>`
  await writeFile(outHtml, html, 'utf8')

  console.log('Wrote', outMd, outHtml)
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
