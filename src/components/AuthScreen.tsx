import { useId, useState } from 'react'
import { loginUser, registerUser } from '../lib/auth'

type AuthMode = 'login' | 'register'

type AuthScreenProps = {
  onAuthenticated: () => void
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const baseId = useId()

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [registerError, setRegisterError] = useState<string | null>(null)
  const [loginPending, setLoginPending] = useState(false)
  const [registerPending, setRegisterPending] = useState(false)

  const loginTabId = `${baseId}-tab-login`
  const registerTabId = `${baseId}-tab-register`
  const loginPanelId = `${baseId}-panel-login`
  const registerPanelId = `${baseId}-panel-register`

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950"
      data-testid="auth-screen"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="mb-6 text-center">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-lg font-bold text-white"
            aria-hidden
          >
            TM
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            TaskFlow
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Sign in or create an account to continue
          </p>
        </div>

        <div role="tablist" aria-label="Authentication" className="mb-6 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            role="tab"
            id={loginTabId}
            aria-selected={mode === 'login'}
            aria-controls={loginPanelId}
            tabIndex={mode === 'login' ? 0 : -1}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium outline-none ring-violet-500 transition-colors focus-visible:ring-2 ${
              mode === 'login'
                ? 'bg-white text-violet-700 shadow dark:bg-zinc-900 dark:text-violet-300'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
            data-testid="auth-tab-login"
            onClick={() => {
              setMode('login')
              setLoginError(null)
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            id={registerTabId}
            aria-selected={mode === 'register'}
            aria-controls={registerPanelId}
            tabIndex={mode === 'register' ? 0 : -1}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium outline-none ring-violet-500 transition-colors focus-visible:ring-2 ${
              mode === 'register'
                ? 'bg-white text-violet-700 shadow dark:bg-zinc-900 dark:text-violet-300'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
            data-testid="auth-tab-register"
            onClick={() => {
              setMode('register')
              setRegisterError(null)
            }}
          >
            Create account
          </button>
        </div>

        {mode === 'login' ? (
          <div
            id={loginPanelId}
            role="tabpanel"
            aria-labelledby={loginTabId}
            data-testid="auth-panel-login"
          >
            <form
              data-testid="login-form"
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setLoginError(null)
                setLoginPending(true)
                try {
                  const r = await loginUser({
                    email: loginEmail,
                    password: loginPassword,
                  })
                  if (r.ok) onAuthenticated()
                  else setLoginError(r.error)
                } finally {
                  setLoginPending(false)
                }
              }}
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  data-testid="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  data-testid="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>
              {loginError ? (
                <div
                  role="alert"
                  data-testid="login-error"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {loginError}
                </div>
              ) : null}
              <button
                type="submit"
                data-testid="login-submit"
                disabled={loginPending}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60"
              >
                {loginPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        ) : (
          <div
            id={registerPanelId}
            role="tabpanel"
            aria-labelledby={registerTabId}
            data-testid="auth-panel-register"
          >
            <form
              data-testid="register-form"
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault()
                setRegisterError(null)
                if (regPassword !== regConfirm) {
                  setRegisterError('Passwords do not match.')
                  return
                }
                setRegisterPending(true)
                try {
                  const r = await registerUser({
                    name: regName,
                    email: regEmail,
                    password: regPassword,
                  })
                  if (r.ok) onAuthenticated()
                  else setRegisterError(r.error)
                } finally {
                  setRegisterPending(false)
                }
              }}
            >
              <div>
                <label
                  htmlFor="register-name"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Full name
                </label>
                <input
                  id="register-name"
                  data-testid="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="register-email"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  data-testid="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="register-password"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  data-testid="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-zinc-500">At least 8 characters</p>
              </div>
              <div>
                <label
                  htmlFor="register-password-confirm"
                  className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  Confirm password
                </label>
                <input
                  id="register-password-confirm"
                  data-testid="register-password-confirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  required
                />
              </div>
              {registerError ? (
                <div
                  role="alert"
                  data-testid="register-error"
                  className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200"
                >
                  {registerError}
                </div>
              ) : null}
              <button
                type="submit"
                data-testid="register-submit"
                disabled={registerPending}
                className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-60"
              >
                {registerPending ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
