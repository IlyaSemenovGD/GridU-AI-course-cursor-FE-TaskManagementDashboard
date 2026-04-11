# TaskFlow — Task Management Dashboard

A single-page **task management and team collaboration** UI built with React, backed by a **Flask REST API** (JWT auth, SQLAlchemy, SQLite by default, Marshmallow validation, Flasgger/Swagger, CORS). **Socket.IO** pushes notifications in real time. The Vite app talks to the API via `VITE_API_URL` (see `.env.example`). Theme preference and the demo **activity feed** still use **localStorage** on the client; tasks, projects, users, and notifications persist in the database.

---

## Functionality

- **Authentication** — Register and sign in with email and password; the API issues **JWT access tokens** (stored in memory / session helpers on the client). Passwords are **hashed** on the server (Werkzeug).
- **Dashboard** — Project overview, KPI stat widgets, team avatars, quick actions, task progress visuals, recent activity feed, and a form to create tasks.
- **My tasks** — Same task list and stats in a task-focused layout; tasks are loaded and saved through the **REST API**.
- **Board** — Kanban columns **To do**, **In progress**, and **Done**; drag cards between columns to update status (native HTML5 drag-and-drop).
- **Team / Calendar** — Team roster view and a calendar placeholder for future integration.
- **Settings** — Tabbed panels (Profile, Notifications, Privacy, Appearance) with forms, toggles, and selects; light/dark theme can be aligned with the header toggle. **Profile** saves display name and email via `PUT /api/users/me`; **Change password** uses `POST /api/users/me/password`; **Privacy → Danger zone** deletes the account with `DELETE /api/users/me` (password required). Registration enforces passwords ≥ 8 characters.
- **Theming** — Tailwind CSS with a `dark` class on `<html>`, persisted preference, and responsive layout from mobile to desktop.

---

## Architecture and technology decisions

| Area | Decision |
|------|----------|
| **Runtime (frontend)** | React 19 with the Vite bundler and TypeScript (`tsc -b` before production build). |
| **Runtime (backend)** | Flask 3 with **Flask-JWT-Extended**, **Flask-SQLAlchemy**, **Flask-Marshmallow**, **Flask-CORS**, **Flasgger** (Swagger UI), and **Flask-SocketIO** (threading async mode). |
| **Styling** | Tailwind CSS v4 via the official Vite plugin (`@tailwindcss/vite`). Dark mode uses `@custom-variant dark` plus a class on `document.documentElement`. |
| **State (frontend)** | Global UI state lives in `App.tsx` (session, navigation, tasks, activities, theme). No Redux—appropriate for a focused SPA. |
| **Persistence** | **Server:** SQLite file at `backend/instance/app.db` by default (configurable via `SQLALCHEMY_DATABASE_URI`). On startup, `create_all()` plus a small **SQLite migration** adds missing columns on older DB files (e.g. `tasks.project_id`). **Client:** theme (`tm-theme`), activity feed (`activityStore`), and related keys in `localStorage`. |
| **API** | JSON REST under `/api/…`; **Swagger UI** at `/apidocs/` (root `/` redirects there). Health check: `GET /health`. |
| **Routing (frontend)** | Sidebar-driven “views” via React state (`activeNav`), not a separate router library. |
| **Testing** | **Backend:** pytest under `backend/tests/`. **Frontend:** Playwright for E2E; `@axe-core/playwright` for accessibility checks in selected tests. |

---

## Project structure and components (overview)

| Location | Role |
|----------|------|
| `backend/app/__init__.py` | App factory: extensions, CORS, Swagger, Socket.IO handlers, error handlers, `db.create_all()` and SQLite upgrades. |
| `backend/app/config.py` | Environment-based config (development / production / testing); `.env` via `python-dotenv`. |
| `backend/app/extensions.py` | Shared `db`, `jwt`, `ma`, `socketio`. |
| `backend/app/models/` | SQLAlchemy models: `User`, `Task`, `Project`, `ProjectMember`, `Notification`. |
| `backend/app/schemas/` | Marshmallow schemas for request/response validation and serialization. |
| `backend/app/api/` | Blueprints: `auth`, `users`, `tasks`, `projects`, `notifications`, `health`. |
| `backend/app/services/` | `notification_service`, `task_access` (visibility helpers). |
| `backend/app/socketio_events.py` | Real-time notification events (JWT on connect). |
| `backend/app/utils/errors.py` | Centralized HTTP / validation error handling. |
| `backend/app/db_sqlite_upgrade.py` | SQLite-only column patches for legacy DB files. |
| `backend/run.py` | Dev entry: `socketio.run` on `PORT` (default `5000`). |
| `backend/tests/` | pytest fixtures and API tests. |
| `src/App.tsx` | Root layout: auth gate, sidebar, header, main content by `activeNav`, task handlers and API integration. |
| `src/components/AuthScreen.tsx` | Sign-in / register tabs and forms. |
| `src/components/Header.tsx` | Title, theme toggle, user menu, sign-out. |
| `src/components/Sidebar.tsx` | Workspace navigation (buttons). |
| `src/components/TaskCard.tsx` / `TaskCreateForm.tsx` | List and create tasks; optional complete/delete actions. |
| `src/components/SettingsPanel.tsx` | Tabbed settings UI (ARIA tabs pattern). |
| `src/components/dashboard/*` | Collaboration dashboard: `DashboardCollaboration`, `ProjectOverview`, `DashboardStats`, `TeamAvatars`, `QuickActions`, `TaskProgressCharts`, `ActivityFeed`, `TasksPanel`, `TasksWorkspace`, `TeamPage`, `CalendarPlaceholder`. |
| `src/components/kanban/*` | `KanbanBoard`, `KanbanColumn`, `KanbanTaskCard`; `kanbanDnD.ts` holds drag payload MIME type for future library swaps. |
| `src/lib/auth.ts` | Register, login, logout, JWT session helpers. |
| `src/lib/apiClient.ts` / `src/lib/taskApi.ts` | API base URL, `fetch` helpers for tasks (and related resources). |
| `src/lib/env.ts` | `VITE_API_URL` and typed env surface. |
| `src/lib/activityStore.ts` | Load/save activity feed per user (client-only demo data). |
| `src/data/team.ts` | Demo team roster and `mergeTeamWithUser`. |
| `src/types.ts` / `src/types/dashboard.ts` | Shared TypeScript types. |
| `e2e/` | Playwright specs: workflows, errors, accessibility, responsive. |
| `playwright.config.ts` | Starts the Flask API (health on port 5000) and the Vite dev server on **5174** for tests. |

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm** (ships with Node).
- **Python** 3.11+ and a virtual environment (recommended for the backend).

---

## Run the project locally (after cloning)

From the repository root (the folder that contains this `README.md`, `package.json`, and `backend/`):

### Backend — Flask API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional: edit secrets and DB URL
python run.py
```

The API listens on **`http://127.0.0.1:5000`** by default (`PORT` in `.env`). Open **`http://127.0.0.1:5000/apidocs/`** for Swagger UI.

Optional: create tables only (usually not needed—startup runs `create_all()` and SQLite migrations):

```bash
cd backend && source .venv/bin/activate && flask --app run init-db
```

### Frontend — Vite dev server

In a **second** terminal, from the repository root:

```bash
cp .env.example .env        # ensure VITE_API_URL matches the API (default http://127.0.0.1:5000)
npm install
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`). Vite binds to all interfaces by default; use the link shown in your terminal.

Other useful commands:

```bash
npm run build    # Typecheck + production build to dist/
npm run preview  # Serve the production build locally
npm run lint     # ESLint on the app source
```

---

## Run tests locally (after cloning)

### Backend (pytest)

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
pytest
```

### Frontend — Playwright (E2E)

End-to-end tests start the **Flask API** (health on `http://127.0.0.1:5000`) and the Vite dev server on **`http://127.0.0.1:5174`** so tests do not collide with a normal dev server on **5173**. See `playwright.config.ts`. Install dependencies once, then install browser binaries once per machine:

```bash
cd TaskManagementDashboard
npm install
npx playwright install chromium
```

Run the full E2E suite:

```bash
npm run test:e2e
```

Optional interactive UI mode:

```bash
npm run test:e2e:ui
```

In **CI** or when you want a clean run (single worker, no reuse of an already running dev server), you can set `CI=1`:

```bash
CI=1 npm run test:e2e
```

If Playwright reports missing browsers, run `npx playwright install` (or `npx playwright install chromium`) again from the same directory.

### What the E2E suite covers

| Area | Spec file | What is checked |
|------|-----------|-----------------|
| Auth & tasks | `workflow.spec.ts` | Register, create/complete/delete task, logout; login after register |
| Errors | `errors.spec.ts` | Wrong password, unknown email, password mismatch, duplicate email |
| A11y | `accessibility.spec.ts` | axe (serious/critical) on auth and dashboard; skip link |
| Responsive | `responsive.spec.ts` | Mobile sidebar, desktop layout, settings tabs on narrow view |
| Navigation | `navigation.spec.ts` | Sidebar: My tasks, Board, Calendar, Team, Dashboard, Settings; quick action → settings |
| Kanban | `kanban.spec.ts` | Drag task to **In progress**; drag to **Done** and list sync |
| Dashboard | `dashboard.spec.ts` | Overview/widgets/feed; activity after create; theme toggle round-trip |

**Not exhaustively covered (lower ROI or better suited to unit/integration tests):** every Settings tab form submit, every stat KPI formula, client `localStorage` edge cases, and touch-specific Kanban gestures (native HTML5 DnD is covered on desktop; a future `@dnd-kit` migration would warrant extra cases).

---

## Security note

This project is intended for **learning and local development**. Use strong `SECRET_KEY` and `JWT_SECRET_KEY` in production, enable HTTPS, set sensible token expiry, and restrict CORS origins. Do not expose debug servers or default secrets on the public internet.
