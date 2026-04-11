# QA automation system

## Overview

| Layer | Tools |
|-------|--------|
| **E2E (Page Object Model)** | Playwright — `e2e/pages/`, `e2e/fixtures.ts`, specs in `e2e/*.spec.ts` |
| **Unit tests** | Vitest (frontend), pytest (backend) |
| **Lint** | ESLint, Pylint |
| **Security** | Snyk, pip-audit, Bandit, OWASP ZAP baseline |
| **Performance** | Lighthouse CI, k6 |
| **Reports** | `qa-reports/` — JUnit, coverage JSON, HTML dashboard, Playwright HTML |

Workflow: **`.github/workflows/qa.yml`** (also PR/CI workflows for faster gates).

## Page Object Model (Playwright)

- **`e2e/pages/BasePage.ts`** — shared `page` and `goto`.
- **`e2e/pages/AuthPage.ts`** — login / registration (`data-testid` selectors).
- **`e2e/pages/AppShellPage.ts`** — workspace nav, sign-out, task helpers.
- **`e2e/fixtures.ts`** — `test` extended with `authPage` and `appShell`.

Use in specs:

```ts
import { expect, test } from './fixtures'

test('example', async ({ page, authPage, appShell }) => {
  await page.goto('/')
  await authPage.register({ name: 'T', email: 'a@b.c', password: 'x12345678' })
  await appShell.signOut()
})
```

Legacy helpers in **`e2e/helpers.ts`** delegate to the same page objects (`registerAndLandOnDashboard`, `signOut`, `workspaceNav`, …).

## Pylint gate

`npm run qa:run` and CI use **`pylint app --fail-under=8.5`**: the process exits **0** when the score is at least **8.5/10**, even if there are style messages. (A plain `pylint app` run often exits **30** because of message bitmasks—that is expected and is why the script uses `--fail-under`.)

## Run all checks locally

From the repo root:

```bash
npm ci
cd backend && python3 -m pip install -r requirements.txt -r requirements-ci.txt && cd ..
node scripts/qa/run-all.mjs
```

Or:

```bash
npm run qa:run
```

**Skip heavy steps** (faster iteration):

| Variable | Effect |
|----------|--------|
| `QA_SKIP_E2E=1` | Skip Playwright |
| `QA_SKIP_LIGHTHOUSE=1` | Skip `npm run build` + Lighthouse |
| `QA_SKIP_BACKEND=1` | Skip pytest + pylint |

**Regenerate reports only** (after artifacts already exist under `qa-reports/`):

```bash
npm run qa:report
```

Open **`qa-reports/dashboard/index.html`** (uses Chart.js from CDN for bar + radar charts). E2E HTML: **`qa-reports/playwright-report/index.html`**.

## GitHub Actions secrets (optional)

| Secret | Purpose |
|--------|---------|
| `SNYK_TOKEN` | Snyk |
| `OPENAI_API_KEY` | GPT bullets in `ai-recommendations` |
| `OPENAI_MODEL` | Repo variable; default `gpt-4o-mini` |

## Triggers

`qa.yml`: `push` / `pull_request` to `main`/`master`, weekly cron, `workflow_dispatch`.

Adjust `on:` in `qa.yml` if the full suite (E2E + ZAP + Lighthouse) should run only on `main` or on a schedule.
