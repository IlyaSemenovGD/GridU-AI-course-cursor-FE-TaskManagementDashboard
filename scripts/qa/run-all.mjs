#!/usr/bin/env node
/**
 * Run all local QA checks (lint, unit tests, backend tests + pylint, optional E2E / Lighthouse),
 * then aggregate metrics and generate HTML + AI recommendation reports under qa-reports/.
 *
 * Environment (skip heavy steps):
 *   QA_SKIP_E2E=1       — skip Playwright
 *   QA_SKIP_LIGHTHOUSE=1 — skip npm run build + lhci
 *   QA_SKIP_BACKEND=1   — skip pytest + pylint
 *   OPENAI_API_KEY      — optional, for qa:recommendations
 */
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
process.chdir(root)
mkdirSync('qa-reports', { recursive: true })

function run(label, cmd, opts = {}) {
  console.log(`\n═══ ${label} ═══`)
  execSync(cmd, { stdio: 'inherit', shell: '/bin/bash', env: { ...process.env, FORCE_COLOR: '1' }, ...opts })
}

try {
  run('ESLint (JSON report)', 'npm run lint:report || true')
  run('ESLint (gate)', 'npm run lint')

  run('Vitest + coverage', 'npm run test:coverage')

  if (!process.env.QA_SKIP_BACKEND) {
    const pip = 'python3 -m pip install -q -r requirements.txt -r requirements-ci.txt'
    run(
      'pytest + coverage + JUnit',
      `cd backend && ${pip} && python3 -m pytest tests/ -q --tb=short --cov=app --cov-report=json:../qa-reports/pytest/coverage.json --junitxml=../qa-reports/pytest/junit.xml`,
    )
    run(
      'Pylint (log + score gate ≥8.5/10)',
      `cd backend && set -o pipefail && pylint app --fail-under=8.5 2>&1 | tee ../qa-reports/pylint.txt`,
    )
  } else {
    console.log('\n[skip] QA_SKIP_BACKEND set')
  }

  if (!process.env.QA_SKIP_E2E) {
    if (!existsSync(join(root, 'node_modules', '@playwright', 'test'))) {
      console.log('\n[skip] Playwright not installed — run npm ci')
    } else {
      run('Playwright E2E (Page Object Model)', 'npx playwright install --with-deps chromium && npx playwright test')
    }
  } else {
    console.log('\n[skip] QA_SKIP_E2E set')
  }

  if (!process.env.QA_SKIP_LIGHTHOUSE) {
    run('Production build + Lighthouse CI', 'npm run build && npm run lhci')
  } else {
    console.log('\n[skip] QA_SKIP_LIGHTHOUSE set')
  }

  run('Aggregate summary.json', 'node scripts/qa/aggregate-summary.mjs')
  run('AI + heuristic recommendations', 'node scripts/qa/ai-recommendations.mjs')
  run('HTML dashboard', 'node scripts/qa/build-dashboard.mjs')

  console.log('\n✓ QA run complete. Open: qa-reports/dashboard/index.html')
  console.log('  E2E HTML (if run): qa-reports/playwright-report/index.html')
} catch (e) {
  console.error(e)
  process.exit(1)
}
