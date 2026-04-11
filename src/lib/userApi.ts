import { apiFetch } from './apiClient'

export type ApiUserProfile = {
  id: number
  email: string
  full_name: string
  username: string
  role?: string
}

function errorMessage(data: Record<string, unknown>): string {
  if (typeof data.message === 'string') return data.message
  const errs = data.errors
  if (errs && typeof errs === 'object') {
    const first = Object.values(errs as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return String(first[0])
  }
  return 'Request failed.'
}

export async function updateProfile(input: {
  full_name?: string
  email?: string
}): Promise<{ ok: true; user: ApiUserProfile } | { ok: false; error: string }> {
  const res = await apiFetch('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessage(data) }
  return { ok: true, user: data as unknown as ApiUserProfile }
}

export async function changePassword(input: {
  current_password: string
  new_password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await apiFetch('/api/users/me/password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessage(data) }
  return { ok: true }
}

export async function deleteAccount(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await apiFetch('/api/users/me', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  if (res.status === 204) return { ok: true }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: false, error: errorMessage(data) }
}
