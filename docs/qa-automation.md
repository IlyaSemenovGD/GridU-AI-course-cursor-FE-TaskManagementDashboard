# QA automation system

This repository runs a dedicated **QA automation** workflow (`.github/workflows/qa.yml`) plus the existing PR and CI/CD pipelines.

## What runs where

| Area | Tool | Where |
|------|------|--------|
| Frontend unit tests | **Vitest** (Jest-compatible API; works with Vite and `import.meta.env`) | `npm test`, `npm run test:coverage` |
| Backend unit tests | **pytest** + **pytest-cov** | `python -m pytest` in `backend/` |
| Frontend lint | **ESLint** | `npm run lint`, `npm run lint:report` |
| Backend lint | **Pylint** | `pylint app` (config: `backend/.pylintrc`) |
| Dependency / SAST | **Snyk** (optional), **pip-audit**, **Bandit** | PR workflow + `qa.yml` |
| DAST | **OWASP ZAP** baseline (Docker, host network) | `qa.yml` |
| Frontend perf / a11y | **Lighthouse CI** (`@lhci/cli`) | `npm run lhci` after `npm run build` |
| API load / smoke | **k6** | `qa/k6/api-smoke.js` |
| Reporting | HTML dashboard + JSON summary | `scripts/qa/*.mjs` |
| AI suggestions | **OpenAI** Chat Completions (optional) | `OPENAI_API_KEY` secret |

## Local commands

```bash
# Frontend
npm ci
npm run lint
npm run test
npm run test:coverage

# Backend
cd backend && pip install -r requirements.txt -r requirements-ci.txt
python -m pytest tests/ -q
pylint app

# Lighthouse (needs build first)
npm run build && npm run lhci

# Merge reports + dashboard + AI (after tests wrote under qa-reports/)
npm run qa:aggregate
npm run qa:recommendations   # uses OPENAI_API_KEY if set
npm run qa:dashboard
```

Open `qa-reports/dashboard/index.html` in a browser after generation.

## GitHub Actions secrets (optional)

| Secret | Purpose |
|--------|---------|
| `SNYK_TOKEN` | Enable Snyk in QA and PR security jobs |
| `OPENAI_API_KEY` | GPT-based improvement bullets in `ai-recommendations` |
| `OPENAI_MODEL` | Repository variable (optional); defaults to `gpt-4o-mini` |

## Workflow triggers

`qa.yml` runs on pushes and pull requests to `main`/`master`, weekly (cron), and `workflow_dispatch`. It is heavier than the default PR workflow (ZAP + Lighthouse + k6); adjust `on:` in `qa.yml` if you want QA only on `main` or on a schedule.

## Artifacts

The final job uploads **`qa-dashboard`**: `summary.json`, `dashboard/index.html`, and AI recommendation files. Download the artifact from the workflow run to review the HTML report offline.
