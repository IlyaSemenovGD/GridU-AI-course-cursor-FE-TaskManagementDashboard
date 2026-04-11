#!/usr/bin/env node
/**
 * Merge available QA outputs into qa-reports/summary.json for the dashboard + AI step.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'qa-reports')
const outFile = join(outDir, 'summary.json')

async function readJson(path) {
  if (!existsSync(path)) return null
  try {
    const t = await readFile(path, 'utf8')
    return JSON.parse(t)
  } catch {
    return null
  }
}

async function readText(path) {
  if (!existsSync(path)) return null
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

function pylintScoreFromText(text) {
  if (!text) return null
  const m = text.match(/rated at ([0-9.]+)\/10/)
  return m ? Number.parseFloat(m[1]) : null
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const vitest = await readJson(join(outDir, 'vitest-results.json'))
  const vitestCov = await readJson(join(outDir, 'coverage-frontend', 'coverage-summary.json'))
  const pytestCov = await readJson(join(outDir, 'pytest', 'coverage.json'))
  const eslint = await readJson(join(outDir, 'eslint.json'))
  const pylintTxt = await readText(join(outDir, 'pylint.txt'))
  const k6 = await readJson(join(outDir, 'k6-summary.json'))
  const lighthouseManifest = await readJson(join(outDir, 'lighthouse', 'manifest.json'))
  const zapJson = await readJson(join(outDir, 'zap-report.json'))

  const eslintProblems = Array.isArray(eslint)
    ? eslint.reduce((n, f) => {
        if (f.messages?.length != null) return n + f.messages.length
        return n + (f.errorCount || 0) + (f.warningCount || 0)
      }, 0)
    : null

  const summary = {
    generatedAt: new Date().toISOString(),
    frontend: {
      vitest: vitest
        ? {
            success: vitest.success !== false,
            numTotalTests: vitest.numTotalTests,
            numPassedTests: vitest.numPassedTests,
            numFailedTests: vitest.numFailedTests,
          }
        : null,
      coverage: vitestCov?.total
        ? {
            lines: vitestCov.total.lines?.pct,
            statements: vitestCov.total.statements?.pct,
            functions: vitestCov.total.functions?.pct,
            branches: vitestCov.total.branches?.pct,
          }
        : null,
      eslint: {
        problems: eslintProblems,
      },
    },
    backend: {
      pytestCoverage: pytestCov?.totals
        ? {
            percent_covered: pytestCov.totals.percent_covered,
            covered_lines: pytestCov.totals.covered_lines,
            num_statements: pytestCov.totals.num_statements,
          }
        : null,
      pylint: {
        score: pylintScoreFromText(pylintTxt),
      },
    },
    performance: {
      k6: k6
        ? {
            http_req_failed: k6.metrics?.http_req_failed?.values?.rate,
            http_req_duration_p95: k6.metrics?.http_req_duration?.values?.['p(95)'],
          }
        : null,
      lighthouse: lighthouseManifest
        ? {
            url: lighthouseManifest[0]?.url,
            summary: lighthouseManifest[0]?.summary,
          }
        : null,
    },
    security: {
      zap: zapJson
        ? {
            site: zapJson.site?.[0]?.['@name'],
            alerts: zapJson.site?.[0]?.alerts?.length,
          }
        : null,
    },
  }

  await writeFile(outFile, JSON.stringify(summary, null, 2), 'utf8')
  console.log('Wrote', outFile)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
