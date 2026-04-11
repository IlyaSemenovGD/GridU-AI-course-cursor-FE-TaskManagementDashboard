import { useEffect, useId, useRef, useState } from 'react'

type HeaderProps = {
  onMenuOpen: () => void
  sidebarOpen: boolean
  darkMode: boolean
  onToggleTheme: () => void
  pageTitle: string
  pageDescription?: string
  userDisplayName: string
  userInitials: string
  /** Open Settings on the Profile tab (name, email, password). */
  onUserMenuProfile: () => void
  /** Open Settings (Privacy tab: preferences + delete account). */
  onUserMenuAccountSettings: () => void
  onSignOut: () => void
}

export function Header({
  onMenuOpen,
  sidebarOpen,
  darkMode,
  onToggleTheme,
  pageTitle,
  pageDescription = 'Track work across your workspace',
  userDisplayName,
  userInitials,
  onUserMenuProfile,
  onUserMenuAccountSettings,
  onSignOut,
}: HeaderProps) {
  const menuId = useId()
  const [userOpen, setUserOpen] = useState(false)
  const userBtnRef = useRef<HTMLButtonElement>(null)
  const userPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userOpen) return
    const handle = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        userPanelRef.current?.contains(t) ||
        userBtnRef.current?.contains(t)
      )
        return
      setUserOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', onKey)
    }
  }, [userOpen])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white/95 px-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:h-16 sm:px-4 lg:px-6">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 outline-none ring-violet-500 hover:bg-zinc-100 focus-visible:ring-2 dark:text-zinc-200 dark:hover:bg-zinc-900 lg:hidden"
        onClick={onMenuOpen}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        aria-label="Open navigation menu"
      >
        <IconMenu className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50 sm:text-xl">
          {pageTitle}
        </h1>
        {pageDescription ? (
          <p className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">
            {pageDescription}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 outline-none ring-violet-500 hover:bg-zinc-100 focus-visible:ring-2 dark:text-zinc-200 dark:hover:bg-zinc-900"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={darkMode}
        >
          {darkMode ? (
            <IconSun className="h-5 w-5" aria-hidden />
          ) : (
            <IconMoon className="h-5 w-5" aria-hidden />
          )}
        </button>

        <div className="relative">
          <button
            ref={userBtnRef}
            type="button"
            id={`${menuId}-user-btn`}
            data-testid="user-menu-button"
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 outline-none ring-violet-500 hover:bg-zinc-100 focus-visible:ring-2 dark:hover:bg-zinc-900"
            aria-expanded={userOpen}
            aria-haspopup="menu"
            aria-controls={`${menuId}-user-menu`}
            onClick={() => setUserOpen((v) => !v)}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white"
              aria-hidden
            >
              {userInitials}
            </span>
            <span className="hidden max-w-[8rem] truncate text-left text-sm font-medium text-zinc-800 dark:text-zinc-100 sm:block">
              {userDisplayName}
            </span>
            <IconChevronDown
              className={`hidden h-4 w-4 text-zinc-500 sm:block ${userOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {userOpen ? (
            <div
              ref={userPanelRef}
              id={`${menuId}-user-menu`}
              role="menu"
              aria-labelledby={`${menuId}-user-btn`}
              className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-zinc-800 outline-none ring-inset ring-violet-500 hover:bg-zinc-50 focus-visible:ring-2 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setUserOpen(false)
                  onUserMenuProfile()
                }}
              >
                Profile
              </button>
              <button
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left text-sm text-zinc-800 outline-none ring-inset ring-violet-500 hover:bg-zinc-50 focus-visible:ring-2 dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => {
                  setUserOpen(false)
                  onUserMenuAccountSettings()
                }}
              >
                Account settings
              </button>
              <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
              <button
                type="button"
                role="menuitem"
                data-testid="sign-out-button"
                className="w-full px-4 py-2.5 text-left text-sm text-rose-700 outline-none ring-inset ring-violet-500 hover:bg-rose-50 focus-visible:ring-2 dark:text-rose-400 dark:hover:bg-rose-950/50"
                onClick={() => {
                  setUserOpen(false)
                  onSignOut()
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function IconMenu(props: { className?: string; 'aria-hidden'?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  )
}

function IconSun(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function IconMoon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

function IconChevronDown(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
