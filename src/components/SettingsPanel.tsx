import { useCallback, useId, useState, type KeyboardEvent } from 'react'

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'appearance', label: 'Appearance' },
] as const

type TabId = (typeof TABS)[number]['id']

type SettingsPanelProps = {
  darkMode: boolean
  onDarkModeChange: (dark: boolean) => void
}

export function SettingsPanel({ darkMode, onDarkModeChange }: SettingsPanelProps) {
  const baseId = useId()
  const [activeTab, setActiveTab] = useState<TabId>('profile')
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
              <ProfileTab onSave={() => announceSave('Profile settings saved.')} />
            ) : null}
            {activeTab === 'notifications' ? (
              <NotificationsTab
                onSave={() => announceSave('Notification settings saved.')}
              />
            ) : null}
            {activeTab === 'privacy' ? (
              <PrivacyTab onSave={() => announceSave('Privacy settings saved.')} />
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

function ProfileTab({ onSave }: { onSave: () => void }) {
  const nameId = useId()
  const emailId = useId()
  const titleId = useId()
  const bioId = useId()

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        onSave()
      }}
    >
      <fieldset className="space-y-4 border-0 p-0">
        <legend className="sr-only">Profile information</legend>
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
              defaultValue="Jordan Doe"
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
              defaultValue="jordan@example.com"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor={titleId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Job title
          </label>
          <input
            id={titleId}
            name="jobTitle"
            type="text"
            autoComplete="organization-title"
            defaultValue="Product designer"
            className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
        <div>
          <label
            htmlFor={bioId}
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Bio
          </label>
          <textarea
            id={bioId}
            name="bio"
            rows={4}
            defaultValue="I focus on accessible workflows and clear task ownership across teams."
            className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-violet-500 placeholder:text-zinc-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
        </div>
      </fieldset>
      <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-600 px-4 text-sm font-medium text-white outline-none ring-violet-500 transition-colors hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900"
        >
          Save profile
        </button>
      </div>
    </form>
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

function PrivacyTab({ onSave }: { onSave: () => void }) {
  const visibilityId = useId()
  const [profileVisible, setProfileVisible] = useState(true)
  const [analytics, setAnalytics] = useState(false)
  const [activityVisibility, setActivityVisibility] = useState('team')

  return (
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
