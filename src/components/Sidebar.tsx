import { useEffect, useRef, useState } from 'react'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: IconLayout },
  { id: 'tasks', label: 'My tasks', icon: IconCheckSquare },
  { id: 'board', label: 'Board', icon: IconKanban },
  { id: 'calendar', label: 'Calendar', icon: IconCalendar },
  { id: 'team', label: 'Team', icon: IconUsers },
  { id: 'settings', label: 'Settings', icon: IconSettings },
] as const

export type SidebarNavId = (typeof navItems)[number]['id']

type SidebarProps = {
  open: boolean
  onClose: () => void
  activeId?: SidebarNavId
  onNavigate: (id: SidebarNavId) => void
}

export function Sidebar({
  open,
  onClose,
  activeId = 'dashboard',
  onNavigate,
}: SidebarProps) {
  const isLarge = useMediaQuery('(min-width: 1024px)')
  const panelRef = useRef<HTMLElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const inertSidebar = !isLarge && !open

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    firstFocusableRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/60 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        id="app-sidebar"
        inert={inertSidebar ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:z-0 lg:w-60 lg:shrink-0 lg:translate-x-0 lg:border-r ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Main navigation"
        aria-hidden={inertSidebar}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800 lg:h-16 lg:justify-start">
          <a
            href="#main-content"
            className="flex min-w-0 items-center gap-2 rounded-md font-semibold text-zinc-900 outline-none ring-violet-500 focus-visible:ring-2 dark:text-zinc-50"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white"
              aria-hidden
            >
              TM
            </span>
            <span className="truncate">TaskFlow</span>
          </a>
          <button
            ref={firstFocusableRef}
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 outline-none ring-violet-500 hover:bg-zinc-100 focus-visible:ring-2 dark:text-zinc-400 dark:hover:bg-zinc-900 lg:hidden"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3" aria-label="Workspace">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = item.id === activeId
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none ring-violet-500 transition-colors focus-visible:ring-2 ${
                      active
                        ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/80 dark:text-violet-100'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      onNavigate(item.id)
                      if (window.matchMedia('(max-width: 1023px)').matches)
                        onClose()
                    }}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <p className="px-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Workspace
          </p>
          <p className="mt-1 truncate px-3 text-sm text-zinc-600 dark:text-zinc-400">
            Product team
          </p>
        </div>
      </aside>
    </>
  )
}

function IconLayout(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

function IconCheckSquare(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  )
}

function IconKanban(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="4" y="4" width="4" height="16" rx="1" />
      <rect x="10" y="4" width="4" height="10" rx="1" />
      <rect x="16" y="4" width="4" height="13" rx="1" />
    </svg>
  )
}

function IconCalendar(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function IconUsers(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function IconSettings(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function IconX(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
