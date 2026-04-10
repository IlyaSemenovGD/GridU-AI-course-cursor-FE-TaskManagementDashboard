import { API_BASE_URL } from './env'

const SESSION_KEY = 'tm-session'

export type Session = {
  userId: string
  email: string
  name: string
  accessToken: string
}

type ApiUser = {
  id: number
  email: string
  full_name: string
  username: string
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function getSession(): Session | null {
  const s = readJson<Session | null>(SESSION_KEY, null)
  if (!s?.accessToken || !s.userId || !s.email) return null
  return s
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null
}

function setSession(session: Session | null) {
  if (session === null) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function sessionFromApiUser(user: ApiUser, accessToken: string): Session {
  return {
    userId: String(user.id),
    email: user.email,
    name: user.full_name || user.username,
    accessToken,
  }
}

async function fetchMe(token: string): Promise<Session | null> {
  const res = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const user = (await res.json()) as ApiUser
  return sessionFromApiUser(user, token)
}

export async function registerUser(input: {
  name: string
  email: string
  password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!email) return { ok: false, error: 'Email is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'Enter a valid email address.' }
  if (password.length < 8)
    return { ok: false, error: 'Password must be at least 8 characters.' }

  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  const data = (await res.json().catch(() => ({}))) as {
    message?: string
    errors?: Record<string, string[]>
    access_token?: string
    id?: number
    email?: string
    full_name?: string
    username?: string
  }

  if (res.status === 409) {
    return {
      ok: false,
      error: 'An account with this email already exists.',
    }
  }
  if (!res.ok) {
    if (data.errors) {
      const first = Object.values(data.errors)[0]?.[0]
      if (first) return { ok: false, error: first }
    }
    return {
      ok: false,
      error:
        typeof data.message === 'string' ? data.message : 'Registration failed.',
    }
  }

  const token = data.access_token
  if (!token || data.id == null) {
    return { ok: false, error: 'Invalid response from server.' }
  }

  const user: ApiUser = {
    id: data.id,
    email: data.email ?? email,
    full_name: data.full_name ?? name,
    username: data.username ?? email,
  }
  setSession(sessionFromApiUser(user, token))
  return { ok: true }
}

export async function loginUser(input: {
  email: string
  password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!email || !password)
    return { ok: false, error: 'Email and password are required.' }

  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json().catch(() => ({}))) as { message?: string; access_token?: string }

  if (!res.ok) {
    if (typeof data.message === 'string') {
      if (data.message.includes('No account found')) {
        return { ok: false, error: 'No account found for this email.' }
      }
      return { ok: false, error: data.message }
    }
    return { ok: false, error: 'Sign in failed.' }
  }

  const token = data.access_token
  if (!token) return { ok: false, error: 'Invalid response from server.' }

  const session = await fetchMe(token)
  if (!session) return { ok: false, error: 'Could not load your profile.' }

  setSession(session)
  return { ok: true }
}

export function logoutUser() {
  setSession(null)
}
