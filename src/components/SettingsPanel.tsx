import { useCallback, useEffect, useId, useState, type KeyboardEvent } from 'react'
import type { Session } from '../lib/auth'
import { mergeProfileIntoSession, persistSession } from '../lib/auth'
import { changePassword, deleteAccount, updateProfile } from '../lib/userApi'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'appearance', label: 'Appearance' },
] as const

type TabId = (typeof TABS)[number]['id']

export type SettingsPanelTabId = TabId

type SettingsPanelProps = {
  darkMode: boolean
  onDarkModeChange: (dark: boolean) => void
  session: Session
  onSessionChange: (session: Session) => void
  /** Called after account is deleted (caller should clear auth and redirect). */
  onAccountDeleted: () => void
  /** Controlled by parent when opening Settings from header / sidebar (switch tab). */
  initialTab?: TabId
}

export function SettingsPanel({
  darkMode,
  onDarkModeChange,
  session,
  onSessionChange,
  onAccountDeleted,
  initialTab = 'profile',
}: SettingsPanelProps) {
  const baseId = useId()
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const announceSave = useCallback((msg: string) => {
    setSaveMessage(msg)
    window.setTimeout(() => setSaveMessage(null), 4000)
  }, [])

  const tabIds = TABS.map((t) => `${baseId}-tab-${t.id}`)
  const panelIds = TABS.map((t) => `${baseId}-panel-${t.id}`)
  const activeIndex = TABS.findIndex((t) => t.id === activeTab)

  const focusTab = (index: number) => {
    const next = (index + TABS.length) % TABS.length
    setActiveTab(TABS[next].id)
    document.getElementById(tabIds[next])?.focus()
  }

  const onTabKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      focusTab(index + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      focusTab(index - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveTab(TABS[0].id)
      document.getElementById(tabIds[0])?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      const last = TABS.length - 1
      setActiveTab(TABS[last].id)
      document.getElementById(tabIds[last])?.focus()
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="mb-6 text-base text-zinc-600 dark:text-zinc-400 sm:mb-8">
        Manage your account preferences and workspace defaults.
      </p>

      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        role="region"
        aria-label="Settings"
      >
        <div className="border-b border-zinc-200 dark:border-zinc-800">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="-mb-px flex gap-1 overflow-x-auto px-2 pt-2 sm:px-4"
          >
            {TABS.map((tab, index) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={tabIds[index]}
                  aria-selected={selected}
                  aria-controls={panelIds[index]}
                  tabIndex={selected ? 0 : -1}
                  className={`shrink-0 whitespace-nowrap rounded-t-lg border border-transparent px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 sm:px-4 ${
                    selected
                      ? 'border-zinc-200 border-b-white bg-white text-violet-700 dark:border-zinc-700 dark:border-b-zinc-900 dark:bg-zinc-900 dark:text-violet-300'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => onTabKeyDown(e, index)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div
            role="tabpanel"
            id={panelIds[activeIndex]}
            aria-labelledby={tabIds[activeIndex]}
            tabIndex={0}
            className="outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
          >
            {activeTab === 'profile' ? (
              <ProfileTab
                session={session}
                onSessionChange={onSessionChange}
                onSave={(msg) => announceSave(msg ?? 'Profile settings saved.')}
              />
            ) : null}
            {activeTab === 'notifications' ? (
              <NotificationsTab
                onSave={() => announceSave('Notification settings saved.')}
              />
            ) : null}
            {activeTab === 'privacy' ? (
              <PrivacyTab
                onSave={() => announceSave('Privacy settings saved.')}
                onAccountDeleted={onAccountDeleted}
              />
            ) : null}
            {activeTab === 'appearance' ? (
              <AppearanceTab
                darkMode={darkMode}
                onDarkModeChange={onDarkModeChange}
                onSave={() => announceSave('Appearance settings saved.')}
              />
            ) : null}
          </div>
        </div>
      </div>

      {saveMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
        >
          {saveMessage}
        </p>
      ) : null}
    </div>
  )
}

function ProfileTab({
  session,
  onSessionChange,
  onSave,
}: {
  session: Session
  onSessionChange: (session: Session) => void
  onSave: (msg?: string) => void
}) {
  const nameId = useId()
  const emailId = useId()
  const curPwdId = useId()
  const newPwdId = useId()
  const confirmPwdId = useId()

  const [fullName, setFullName] = useState(session.name)
  const [email, setEmail] = useState(session.email)
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdBusy, setPwdBusy] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  useEffect(() => {
    setFullName(session.name)
    setEmail(session.email)
  }, [session.name, session.email, session.userId])

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileBusy(true)
    const r = await updateProfile({
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
    })
    setProfileBusy(false)
    if (!r.ok) {
      setProfileError(r.error)
      return
    }
    const next = mergeProfileIntoSession(session, r.user)
    persistSession(next)
    onSessionChange(next)
    onSave('Profile saved.')
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError(null)
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation do not match.')
      return
    }
    setPwdBusy(true)
    const r = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    })
    setPwdBusy(false)
    if (!r.ok) {
      setPwdError(r.error)
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onSave('Password updated.')
  }

  return (
    <div className="space-y-10">
      <form className="space-y-6" onSubmit={(e) => void handleProfileSubmit(e)}>
        <fieldset className="space-y-4 border-0 p-0">
          <legend className="sr-only">Profile information</legend>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Update your display name and email. Email must be unique across accounts.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={nameId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Display name
              </label>
              <input
                id={nameId}
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
            </div>
            <div>
              <label
                htmlFor={emailId}
                className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
              />
            </div>
          </div>
          {profileError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {profileError}
            </p>
          ) : null}
        </fieldset>
        <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <button
            type="submit"
            disabled={profileBusy}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white outline-none ring-violet-500 transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-zinc-900"
          >
            {profileBusy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form className="space-y-6 border-t border-zinc-200 pt-8 dark:border-zinc-800" onSubmit={(e) => void handlePasswordSubmit(e)}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Change password</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your current password and a new password (at least 8 characters).
        </p>
        <div className="max-w-md space-y-3">
          <div>
            <label
              htmlFor={curPwdId}
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Current password
            </label>
            <input
              id={curPwdId}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor={newPwdId}
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              New password
            </label>
            <input
              id={newPwdId}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
          <div>
            <label
              htmlFor={confirmPwdId}
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm new password
            </label>
            <input
              id={confirmPwdId}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            />
          </div>
        </div>
        {pwdError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {pwdError}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pwdBusy}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            {pwdBusy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  )
}

function NotificationsTab({ onSave }: { onSave: () => void }) {
  const digestId = useId()
  const frequencyFieldId = useId()
  const frequencyHintId = useId()
  const [emailDigest, setEmailDigest] = useState(true)
  const [pushTask, setPushTask] = useState(false)
  const [mentions, setMentions] = useState(true)
  const [frequency, setFrequency] = useState('daily')

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <fieldset className="space-y-6 border-0 p-0">
        <legend className="sr-only">Notification preferences</legend>
        <ToggleRow
          id={digestId}
          label="Email digest"
          description="Receive a summary of activity in your workspace."
          checked={emailDigest}
          onChange={setEmailDigest}
        />
        <ToggleRow
          id="push-task"
          label="Push notifications for tasks"
          description="Alerts when a task is assigned or due soon."
          checked={pushTask}
          onChange={setPushTask}
        />
        <ToggleRow
          id="mentions"
          label="Mention alerts"
          description="Notify when someone @mentions you in a comment."
          checked={mentions}
          onChange={setMentions}
        />
        <div className="max-w-md">
          <label
            htmlFor={frequencyFieldId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Digest frequency
          </label>
          <select
            id={frequencyFieldId}
            name="frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            aria-describedby={frequencyHintId}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="realtime">As they happen</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <p id={frequencyHintId} className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Applies when email digest is enabled.
          </p>
        </div>
      </fieldset>
      <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white outline-none ring-violet-500 transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Save notifications
        </button>
      </div>
    </form>
  )
}

function PrivacyTab({
  onSave,
  onAccountDeleted,
}: {
  onSave: () => void
  onAccountDeleted: () => void
}) {
  const visibilityId = useId()
  const deletePwdId = useId()
  const [profileVisible, setProfileVisible] = useState(true)
  const [analytics, setAnalytics] = useState(false)
  const [activityVisibility, setActivityVisibility] = useState('team')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError(null)
    if (
      !window.confirm(
        'Permanently delete your account and all associated data (tasks, projects you own, support tickets)? This cannot be undone.',
      )
    ) {
      return
    }
    setDeleteBusy(true)
    const r = await deleteAccount(deletePassword)
    setDeleteBusy(false)
    if (!r.ok) {
      setDeleteError(r.error)
      return
    }
    persistSession(null)
    onAccountDeleted()
  }

  return (
    <>
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <fieldset className="space-y-6 border-0 p-0">
        <legend className="sr-only">Privacy controls</legend>
        <ToggleRow
          id={visibilityId}
          label="Public profile"
          description="Allow people in your workspace to view your profile card."
          checked={profileVisible}
          onChange={setProfileVisible}
        />
        <ToggleRow
          id="analytics-opt"
          label="Usage analytics"
          description="Help improve the product with anonymous usage data."
          checked={analytics}
          onChange={setAnalytics}
        />
        <div className="max-w-md">
          <label
            htmlFor={visibilityId + '-activity'}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Who can see your activity
          </label>
          <select
            id={visibilityId + '-activity'}
            name="activityVisibility"
            value={activityVisibility}
            onChange={(e) => setActivityVisibility(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="only-me">Only me</option>
            <option value="team">Team members</option>
            <option value="workspace">Everyone in workspace</option>
          </select>
        </div>
      </fieldset>
      <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white outline-none ring-violet-500 transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Save privacy
        </button>
      </div>
    </form>

    <div className="mt-10 border-t border-red-200 pt-8 dark:border-red-900/40">
      <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Danger zone</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Delete your account permanently. You will be signed out immediately.
      </p>
      <form className="mt-4 max-w-md space-y-3" onSubmit={(e) => void handleDeleteAccount(e)}>
        <div>
          <label
            htmlFor={deletePwdId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Confirm with your password
          </label>
          <input
            id={deletePwdId}
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        {deleteError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {deleteError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={deleteBusy || !deletePassword}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
        >
          {deleteBusy ? 'Deleting…' : 'Delete my account'}
        </button>
      </form>
    </div>
    </>
  )
}

function AppearanceTab({
  darkMode,
  onDarkModeChange,
  onSave,
}: {
  darkMode: boolean
  onDarkModeChange: (dark: boolean) => void
  onSave: () => void
}) {
  const themeSelectId = useId()
  const densityId = useId()
  const [density, setDensity] = useState('comfortable')
  const [reduceMotion, setReduceMotion] = useState(false)

  const themeValue = darkMode ? 'dark' : 'light'

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <fieldset className="space-y-6 border-0 p-0">
        <legend className="sr-only">Appearance options</legend>
        <div className="max-w-md">
          <label
            htmlFor={themeSelectId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Theme
          </label>
          <select
            id={themeSelectId}
            name="theme"
            value={themeValue}
            onChange={(e) => onDarkModeChange(e.target.value === 'dark')}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Matches the header toggle; both stay in sync.
          </p>
        </div>
        <div className="max-w-md">
          <label
            htmlFor={densityId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            List density
          </label>
          <select
            id={densityId}
            name="density"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </div>
        <ToggleRow
          id="reduce-motion"
          label="Reduce motion"
          description="Limit animations and transitions across the interface."
          checked={reduceMotion}
          onChange={setReduceMotion}
        />
      </fieldset>
      <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white outline-none ring-violet-500 transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Save appearance
        </button>
      </div>
    </form>
  )
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
        <p id={`${id}-desc`} className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-desc`}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${
          checked ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'
        }`}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition ${
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
          }`}
          aria-hidden
        />
      </button>
    </div>
  )
}
