/** Demo-only local auth for E2E; passwords stored in plain text. Do not use in production. */

export type StoredUser = {
  id: string
  name: string
  email: string
  /** Demo storage only — not secure */
  password: string
}

export type Session = {
  userId: string
  email: string
  name: string
}

const USERS_KEY = 'tm-users'
const SESSION_KEY = 'tm-session'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadUsers(): StoredUser[] {
  return readJson<StoredUser[]>(USERS_KEY, [])
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function getSession(): Session | null {
  return readJson<Session | null>(SESSION_KEY, null)
}

export function setSession(session: Session | null) {
  if (session === null) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function registerUser(input: {
  name: string
  email: string
  password: string
}): { ok: true } | { ok: false; error: string } {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!name) return { ok: false, error: 'Name is required.' }
  if (!email) return { ok: false, error: 'Email is required.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: 'Enter a valid email address.' }
  if (password.length < 8)
    return { ok: false, error: 'Password must be at least 8 characters.' }

  const users = loadUsers()
  if (users.some((u) => u.email.toLowerCase() === email))
    return { ok: false, error: 'An account with this email already exists.' }

  const id = crypto.randomUUID()
  users.push({ id, name, email, password })
  saveUsers(users)
  setSession({ userId: id, email, name })
  return { ok: true }
}

export function loginUser(input: {
  email: string
  password: string
}): { ok: true } | { ok: false; error: string } {
  const email = input.email.trim().toLowerCase()
  const password = input.password

  if (!email || !password)
    return { ok: false, error: 'Email and password are required.' }

  const users = loadUsers()
  const user = users.find((u) => u.email.toLowerCase() === email)
  if (!user) return { ok: false, error: 'No account found for this email.' }
  if (user.password !== password)
    return { ok: false, error: 'Incorrect password. Try again.' }

  setSession({ userId: user.id, email: user.email, name: user.name })
  return { ok: true }
}

export function logoutUser() {
  setSession(null)
}
