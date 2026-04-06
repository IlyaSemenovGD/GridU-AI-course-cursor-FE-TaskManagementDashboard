import { useCallback, useEffect, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { CalendarPlaceholder } from './components/dashboard/CalendarPlaceholder'
import { DashboardCollaboration } from './components/dashboard/DashboardCollaboration'
import { TeamPage } from './components/dashboard/TeamPage'
import { TasksWorkspace } from './components/dashboard/TasksWorkspace'
import { Header } from './components/Header'
import { SettingsPanel } from './components/SettingsPanel'
import { Sidebar, type SidebarNavId } from './components/Sidebar'
import { getSession, logoutUser, type Session } from './lib/auth'
import { loadActivities, saveActivities } from './lib/activityStore'
import { createTask, loadTasksForUser, saveTasksForUser } from './lib/taskStore'
import type { ActivityItem } from './types/dashboard'
import type { Task, TaskStatus } from './types'
import { KanbanBoard } from './components/kanban/KanbanBoard'

const THEME_KEY = 'tm-theme'

function readDarkMode(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

function applyDarkMode(next: boolean) {
  document.documentElement.classList.toggle('dark', next)
  try {
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
  } catch {
    /* ignore */
  }
}

function statusColumnTitle(s: TaskStatus): string {
  switch (s) {
    case 'todo':
      return 'To do'
    case 'in-progress':
      return 'In progress'
    case 'done':
      return 'Done'
  }
}

function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  )
}

function headerCopy(nav: SidebarNavId): { title: string; description: string } {
  switch (nav) {
    case 'settings':
      return {
        title: 'Settings',
        description: 'Account and workspace preferences',
      }
    case 'tasks':
      return {
        title: 'My tasks',
        description: 'Focus on your assigned work',
      }
    case 'board':
      return {
        title: 'Board',
        description: 'Drag tasks between columns',
      }
    case 'calendar':
      return {
        title: 'Calendar',
        description: 'Deadlines and team events',
      }
    case 'team':
      return {
        title: 'Team',
        description: 'People and invites',
      }
    default:
      return {
        title: 'Dashboard',
        description: 'Collaborate and track delivery',
      }
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => getSession())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<SidebarNavId>('dashboard')
  const [darkMode, setDarkMode] = useState(() => readDarkMode())
  const [tasks, setTasks] = useState<Task[]>(() => {
    const s = getSession()
    return s ? loadTasksForUser(s.userId) : []
  })
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    const s = getSession()
    return s ? loadActivities(s.userId) : []
  })

  useEffect(() => {
    if (!session) return
    saveTasksForUser(session.userId, tasks)
  }, [session, tasks])

  useEffect(() => {
    if (!session) return
    saveActivities(session.userId, activities)
  }, [session, activities])

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev
      applyDarkMode(next)
      return next
    })
  }, [])

  const pushActivity = useCallback((item: Omit<ActivityItem, 'id' | 'at'>) => {
    setActivities((prev) =>
      [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          ...item,
        },
        ...prev,
      ].slice(0, 40),
    )
  }, [])

  const handleAuthenticated = useCallback(() => {
    const s = getSession()
    setSession(s)
    if (s) {
      setTasks(loadTasksForUser(s.userId))
      setActivities(loadActivities(s.userId))
    }
  }, [])

  const handleSignOut = useCallback(() => {
    logoutUser()
    setSession(null)
    setTasks([])
    setActivities([])
    setActiveNav('dashboard')
  }, [])

  const addTask = useCallback(
    (input: Parameters<typeof createTask>[1]) => {
      if (!session) return
      const t = createTask(session.userId, {
        ...input,
        assignee: session.name,
      })
      setTasks((prev) => [...prev, t])
      pushActivity({
        type: 'task_created',
        message: `Created “${t.title}”.`,
        actorName: session.name,
      })
    },
    [session, pushActivity],
  )

  const completeTask = useCallback(
    (id: string) => {
      if (!session) return
      let title = 'Task'
      setTasks((prev) => {
        const t = prev.find((x) => x.id === id)
        if (t) title = t.title
        return prev.map((x) =>
          x.id === id ? { ...x, status: 'done' as const } : x,
        )
      })
      pushActivity({
        type: 'task_completed',
        message: `Completed “${title}”.`,
        actorName: session.name,
      })
    },
    [session, pushActivity],
  )

  const deleteTask = useCallback(
    (id: string) => {
      if (!session) return
      let title = 'Task'
      setTasks((prev) => {
        const t = prev.find((x) => x.id === id)
        if (t) title = t.title
        return prev.filter((x) => x.id !== id)
      })
      pushActivity({
        type: 'task_deleted',
        message: `Removed “${title}”.`,
        actorName: session.name,
      })
    },
    [session, pushActivity],
  )

  const moveTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      if (!session) return
      const t = tasks.find((x) => x.id === taskId)
      if (!t || t.status === newStatus) return
      setTasks((prev) =>
        prev.map((x) =>
          x.id === taskId ? { ...x, status: newStatus } : x,
        ),
      )
      pushActivity({
        type: 'task_moved',
        message: `Moved “${t.title}” to ${statusColumnTitle(newStatus)}.`,
        actorName: session.name,
      })
    },
    [session, tasks, pushActivity],
  )

  const total = tasks.length
  const inProgress = tasks.filter((t) => t.status === 'in-progress').length
  const completed = tasks.filter((t) => t.status === 'done').length
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const dueSoon = tasks.filter((t) => {
    const d = new Date(t.dueDate)
    return d >= now && d <= weekEnd && t.status !== 'done'
  }).length
  const completionPercent =
    total === 0 ? 0 : Math.round((completed / total) * 100)
  const activeTaskCount = tasks.filter((t) => t.status !== 'done').length

  const focusTaskForm = useCallback(() => {
    setActiveNav((n) => (n === 'tasks' ? n : 'dashboard'))
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-testid="task-create-form"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        document.querySelector<HTMLInputElement>('[data-testid="task-title"]')?.focus()
      }, 280)
    })
  }, [])

  const { title: pageTitle, description: pageDescription } = headerCopy(activeNav)

  const statIcons = {
    list: <IconList />,
    activity: <IconActivity />,
    check: <IconCheck />,
    clock: <IconClock />,
  }

  if (!session) {
    return (
      <>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:bg-zinc-900 dark:focus:text-zinc-50"
        >
          Skip to main content
        </a>
        <main id="main-content" tabIndex={-1}>
          <AuthScreen onAuthenticated={handleAuthenticated} />
        </main>
      </>
    )
  }

  return (
    <div
      className="flex min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      data-testid="app-shell"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-violet-500 dark:focus:bg-zinc-900 dark:focus:text-zinc-50"
      >
        Skip to main content
      </a>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={activeNav}
        onNavigate={setActiveNav}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuOpen={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
          userDisplayName={session.name}
          userInitials={initialsFromName(session.name)}
          onSignOut={handleSignOut}
        />

        <main
          id="main-content"
          className="flex-1 overflow-x-hidden px-3 py-6 sm:px-4 lg:px-8"
          tabIndex={-1}
          data-testid="dashboard-main"
        >
          {activeNav === 'settings' ? (
            <SettingsPanel
              darkMode={darkMode}
              onDarkModeChange={(dark) => {
                setDarkMode(dark)
                applyDarkMode(dark)
              }}
            />
          ) : activeNav === 'dashboard' ? (
            <DashboardCollaboration
              tasks={tasks}
              activities={activities}
              currentUserName={session.name}
              total={total}
              inProgress={inProgress}
              completed={completed}
              dueSoon={dueSoon}
              completionPercent={completionPercent}
              activeTaskCount={activeTaskCount}
              statIcons={statIcons}
              onCreateTask={addTask}
              onCompleteTask={completeTask}
              onDeleteTask={deleteTask}
              onQuickNewTask={focusTaskForm}
              onNavigateTeam={() => setActiveNav('team')}
              onNavigateSettings={() => setActiveNav('settings')}
            />
          ) : activeNav === 'tasks' ? (
            <TasksWorkspace
              tasks={tasks}
              total={total}
              inProgress={inProgress}
              completed={completed}
              dueSoon={dueSoon}
              onCreate={addTask}
              onComplete={completeTask}
              onDelete={deleteTask}
              statIcons={statIcons}
            />
          ) : activeNav === 'board' ? (
            <KanbanBoard tasks={tasks} onTaskStatusChange={moveTaskStatus} />
          ) : activeNav === 'team' ? (
            <TeamPage currentUserName={session.name} />
          ) : (
            <CalendarPlaceholder />
          )}
        </main>
      </div>
    </div>
  )
}

function IconList() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  )
}

function IconActivity() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}
