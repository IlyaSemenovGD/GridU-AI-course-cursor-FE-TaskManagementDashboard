# CI/CD workflow guide

This repository uses **GitHub Actions** under [`.github/workflows/`](../.github/workflows/). Pipelines are optimized for **cached dependencies**, **parallel tests**, **security scanning** (SAST + dependency audits), a **performance budget** test, optional **blue/green-style** stages, **rollback** on failure, and **monitoring** hooks.

---

## Workflows at a glance

| File | Workflow name (UI) | Purpose |
|------|--------------------|---------|
| [`pull-request.yml`](../.github/workflows/pull-request.yml) | Pull request | Frontend lint + build; backend **pytest-xdist** + serial **performance** tests; **security** (npm audit, pip-audit, Bandit). No deploy. |
| [`dependency-review.yml`](../.github/workflows/dependency-review.yml) | Dependency review | PR dependency diff vs base (requires **Dependency graph** enabled). |
| [`codeql.yml`](../.github/workflows/codeql.yml) | CodeQL | GitHub **CodeQL** SAST for JS/TS and Python (push/PR + weekly schedule). |
| [`frontend-deploy.yml`](../.github/workflows/frontend-deploy.yml) | Frontend deploy | Path-filtered push: build + artifact + deploy placeholder. |
| [`backend-deploy.yml`](../.github/workflows/backend-deploy.yml) | Backend deploy | Path-filtered push: parallel pytest + perf + deploy placeholder. |
| [`ci-cd.yaml`](../.github/workflows/ci-cd.yaml) | CI CD | Full stack: frontend, backend, **security** in parallel → **deploy-green** → **promote-traffic** → **smoke-and-monitor** → **rollback** on failure. |
| [`blue-green-deploy.yml`](../.github/workflows/blue-green-deploy.yml) | Blue-green deploy | **Manual** explicit blue → green → smoke → promote → rollback. |

---

## Optimizations (what was added)

### Caching

- **npm:** `actions/setup-node` with `cache: npm` and `package-lock.json`.
- **pip:** `actions/setup-python` with `cache: pip` and **both** [`backend/requirements.txt`](../backend/requirements.txt) and [`backend/requirements-ci.txt`](../backend/requirements-ci.txt) so CI-only tools stay cached too.

### Parallel test execution

- [`backend/requirements-ci.txt`](../backend/requirements-ci.txt) installs **pytest-xdist**.
- Most tests run with **`-n auto`** (parallel workers).
- Tests marked **`@pytest.mark.performance`** (API latency budget) run **serially** (`-n 0`) to avoid noise from worker contention.

### Security scanning

| Layer | Tool | Where |
|-------|------|--------|
| Supply chain (JS) | `npm audit --audit-level=moderate` | `pull-request.yml`, `ci-cd.yaml` |
| Supply chain (Python) | `pip-audit -r requirements.txt` | same |
| SAST (Python app code) | **Bandit** with [`backend/.bandit.yml`](../backend/.bandit.yml) | same |
| GitHub native SAST | **CodeQL** | [`codeql.yml`](../.github/workflows/codeql.yml) |
| PR dependency changes | **dependency-review-action** | [`dependency-review.yml`](../.github/workflows/dependency-review.yml) |

Private repos may need **GitHub Advanced Security** for some features; **Dependency review** requires the [dependency graph](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-the-dependency-graph) enabled.

### Performance testing

- Backend: pytest tests marked **`performance`** (see [`backend/pytest.ini`](../backend/pytest.ini)) — e.g. median API latency under a budget.

### Blue/green and rollback (`ci-cd.yaml`)

1. **deploy-green** — deploy to a **candidate** slot (placeholder; replace with your second target group / K8s Deployment / App Service slot).
2. **promote-traffic** — switch live traffic to the new version (placeholder).
3. **smoke-and-monitor** — optional **`DEPLOY_HEALTH_URL`** health check; optional **`MONITORING_DEPLOY_WEBHOOK`** JSON POST for Datadog / custom notifier.
4. **rollback** — runs when an upstream job **failed** or smoke **failed**; placeholder instructions (re-point LB, `kubectl rollout undo`, redeploy last artifact). The job exits with failure so the workflow shows red for alerting.

### Monitoring integration

Configure repository **Secrets**:

| Secret | Purpose |
|--------|---------|
| `DEPLOY_HEALTH_URL` | After promote, `curl` this URL (e.g. `https://api.example.com/health`). If unset, the step is skipped. |
| `MONITORING_DEPLOY_WEBHOOK` | Optional POST after deploy (e.g. Datadog Event, Slack incoming webhook). If unset, skipped. |
| `GREEN_HEALTH_URL` | Optional; used by [`blue-green-deploy.yml`](../.github/workflows/blue-green-deploy.yml) to smoke the **green** slot only. |

---

## Using AI to find bottlenecks and tune the pipeline

There is **no built-in “AI step”** in YAML (that would require your own API keys and policies). Use **Copilot, ChatGPT, Cursor**, etc. on:

1. **Slow job logs** — Paste the “Annotations” or step timings from a failed/slow run; ask: *Which step dominated wall time? Should we split jobs, cache more, or use a matrix?*
2. **pytest output** — Ask: *Are tests I/O-bound or CPU-bound? Would xdist help or hurt?* (If tests share global state, reduce workers or use `pytest -n 2`.)
3. **Security noise** — Paste `pip-audit` / Bandit output; ask: *Which findings are true positives vs acceptable risk for our threat model?*
4. **Duplicate workflows** — Ask: *Given these paths filters, when do `frontend-deploy`, `backend-deploy`, and `ci-cd` all run on the same commit?*

**Common bottlenecks**

| Symptom | Things to try |
|---------|----------------|
| Cold `npm ci` every run | Confirm `cache-dependency-path` matches `package-lock.json`; avoid bumping lockfile unnecessarily. |
| Cold `pip install` | Ensure `requirements-ci.txt` is included in `cache-dependency-path`. |
| pytest slow on 1 vCPU | `-n auto` helps CPU-bound tests; I/O-heavy SQLite tests may need fewer workers. |
| CodeQL long | Run on `schedule` weekly + PR only for default branch; or narrow languages. |
| Many workflows per push | Narrow `paths:` or disable redundant deploy workflows. |

---

## When each workflow runs

### Pull request (`pull-request.yml`)

- **Trigger:** `pull_request` → `main` / `master`.
- **Concurrency:** one active run per PR; superseded runs cancel.

### Dependency review (`dependency-review.yml`)

- **Trigger:** pull requests only.
- **Severity:** fails on **moderate** or higher by default (`fail-on-severity`).

### CodeQL (`codeql.yml`)

- **Trigger:** push/PR to `main`/`master`, plus **weekly** cron.

### Full CI/CD (`ci-cd.yaml`)

- **Trigger:** push with path filters (frontend + backend paths) or `workflow_dispatch`.
- **Jobs:** `frontend` ∥ `backend` ∥ `security` → `deploy-green` → `promote-traffic` → `smoke-and-monitor` → conditional `rollback`.

### Blue-green (`blue-green-deploy.yml`)

- **Trigger:** `workflow_dispatch` only (optional input `target`).

---

## Choosing a strategy

1. **PR quality gate:** `pull-request.yml` + `dependency-review.yml` + `codeql.yml`.
2. **Deploy only what changed:** `frontend-deploy.yml` / `backend-deploy.yml`.
3. **Single coordinated release with traffic switch:** `ci-cd.yaml`.
4. **Rare manual blue/green:** `blue-green-deploy.yml`.

Overlapping path filters can still trigger multiple deploy workflows on one commit; narrow or disable duplicates if that is too noisy.

---

## Manual runs (`workflow_dispatch`)

Use **Actions → workflow → Run workflow** for deploy workflows when path filters did not fire (e.g. docs-only commits).

---

## Replacing placeholder deploy / rollback steps

Swap echo steps for real commands: static upload, container registry, Helm, Terraform, SSH, etc. Use **secrets** for credentials. Optional [Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment) for approvals.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Frontend **lint** / **build** | `npm run lint` / `npm run build` locally. |
| Backend **pytest** | `cd backend && pip install -r requirements.txt -r requirements-ci.txt && PYTHONPATH=. pytest tests/ -n auto -m "not performance"` |
| **Bandit** / **pip-audit** failures | Address or temporarily narrow rules in `.bandit.yml`; triage CVEs (upgrade deps or document accepted risk). |
| **dependency-review** missing | Enable dependency graph; for forks, [permissions differ](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/configuring-dependency-review#dependency-review-for-forks). |
| **Rollback** always runs | Check `if:` on `rollback` — it should use `always()` and explicit `needs.*.result` checks (see `ci-cd.yaml`). |

---

## Related files

- [`backend/requirements-ci.txt`](../backend/requirements-ci.txt) — pytest-xdist, pip-audit, Bandit  
- [`backend/.bandit.yml`](../backend/.bandit.yml) — Bandit scope  
- [`.github/workflows/`](../.github/workflows/) — workflow definitions  

---

## Revision

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-04-11 | Initial CI/CD workflow guide |
| 2.0 | 2026-04-11 | Caching, parallel pytest, security, CodeQL, dependency review, perf marker, blue/green, rollback, monitoring, AI-assisted tuning section |
