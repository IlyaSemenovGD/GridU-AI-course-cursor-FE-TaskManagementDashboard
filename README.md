# TaskFlow — Task Management Dashboard

A single-page **task management and team collaboration** UI built with React. It provides authentication, a collaboration dashboard, task CRUD, a Kanban board, settings, and Playwright end-to-end tests. Data is stored **in the browser** (`localStorage`) for demo purposes—there is no remote API.

---

## Functionality

- **Authentication** — Register and sign in with email and password. Sessions and user records are kept in `localStorage` (demo-only; not suitable for production security).
- **Dashboard** — Project overview, KPI stat widgets, team avatars, quick actions, task progress visuals, recent activity feed, and a form to create tasks.
- **My tasks** — Same task list and stats in a task-focused layout.
- **Board** — Kanban columns **To do**, **In progress**, and **Done**; drag cards between columns to update status (native HTML5 drag-and-drop).
- **Team / Calendar** — Team roster view and a calendar placeholder for future integration.
- **Settings** — Tabbed panels (Profile, Notifications, Privacy, Appearance) with forms, toggles, and selects; light/dark theme can be aligned with the header toggle.
- **Theming** — Tailwind CSS with a `dark` class on `<html>`, persisted preference, and responsive layout from mobile to desktop.

---

## Architecture and technology decisions

| Area | Decision |
|------|----------|
| **Runtime** | React 19 with the Vite bundler and TypeScript (`tsc -b` before production build). |
| **Styling** | Tailwind CSS v4 via the official Vite plugin (`@tailwindcss/vite`). Dark mode uses `@custom-variant dark` plus a class on `document.documentElement`. |
| **State** | Global UI state lives in `App.tsx` (session, navigation, tasks, activities, theme). No Redux or external state library—appropriate for a focused SPA demo. |
| **Persistence** | `localStorage` keys: users (`tm-users`), session (`tm-session`), tasks per user (`tm-tasks-{userId}`), activities per user (`tm-activities-{userId}`), theme (`tm-theme`). |
| **Routing** | Sidebar-driven “views” via React state (`activeNav`), not a separate router library. |
| **Testing** | Playwright for E2E; `@axe-core/playwright` for accessibility checks in selected tests. |
| **Linting** | ESLint flat config with TypeScript ESLint and React hooks rules; `e2e/` and `playwright.config.ts` are ignored by ESLint to avoid mixing Playwright globals with the app config. |

---

## Project structure and components (overview)

| Location | Role |
|----------|------|
| `src/App.tsx` | Root layout: auth gate, sidebar, header, main content by `activeNav`, task/activity persistence and handlers. |
| `src/components/AuthScreen.tsx` | Sign-in / register tabs and forms. |
| `src/components/Header.tsx` | Title, theme toggle, user menu, sign-out. |
| `src/components/Sidebar.tsx` | Workspace navigation (buttons). |
| `src/components/TaskCard.tsx` / `TaskCreateForm.tsx` | List and create tasks; optional complete/delete actions. |
| `src/components/SettingsPanel.tsx` | Tabbed settings UI (ARIA tabs pattern). |
| `src/components/dashboard/*` | Collaboration dashboard: `DashboardCollaboration`, `ProjectOverview`, `DashboardStats`, `TeamAvatars`, `QuickActions`, `TaskProgressCharts`, `ActivityFeed`, `TasksPanel`, `TasksWorkspace`, `TeamPage`, `CalendarPlaceholder`. |
| `src/components/kanban/*` | `KanbanBoard`, `KanbanColumn`, `KanbanTaskCard`; `kanbanDnD.ts` holds drag payload MIME type for future library swaps. |
| `src/lib/auth.ts` | Register, login, logout, session helpers. |
| `src/lib/taskStore.ts` / `activityStore.ts` | Load/save tasks and activity feed per user. |
| `src/data/team.ts` | Demo team roster and `mergeTeamWithUser`. |
| `src/types.ts` / `src/types/dashboard.ts` | Shared TypeScript types. |
| `e2e/` | Playwright specs: workflows, errors, accessibility, responsive. |
| `playwright.config.ts` | Starts the Vite dev server for tests; `chromium` and `mobile-chromium` projects. |

---

## Prerequisites

- **Node.js** (LTS recommended) and **npm** (ships with Node).

---

## Run the project locally (after cloning)

From the repository root, go into the project folder (if the repo contains multiple projects, use the folder that contains this `README.md` and `package.json`):

```bash
cd TaskManagementDashboard
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

End-to-end tests expect the dev server to be started by Playwright on **`http://127.0.0.1:5174`** (a dedicated port so tests do not accidentally hit another app you may have on Vite’s default **5173**). See `playwright.config.ts`. Install dependencies once, then install browser binaries once per machine:

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

**Not exhaustively covered (lower ROI or better suited to unit/integration tests):** every Settings tab form submit, every stat KPI formula, `localStorage` migration edge cases, and touch-specific Kanban gestures (native HTML5 DnD is covered on desktop; a future `@dnd-kit` migration would warrant extra cases).

---

## Security note

Passwords in this demo are stored in plain text in `localStorage` for learning and testing only. Do **not** use this authentication approach in production.
