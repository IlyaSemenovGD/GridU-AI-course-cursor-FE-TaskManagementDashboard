import type { Task, TaskPriority, TaskStatus } from '../types'
import { apiFetch } from './apiClient'

type ApiTaskRow = {
  id: string
  user_id: number
  project_id?: number | null
  title: string
  description: string
  due_date: string
  priority: TaskPriority
  status: TaskStatus
  assignee: string
}

export function mapApiTask(row: ApiTaskRow): Task {
  return {
    id: row.id,
    userId: String(row.user_id),
    title: row.title,
    description: row.description,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee,
  }
}

function errorMessageFromBody(data: Record<string, unknown>): string {
  if (typeof data.message === 'string') return data.message
  const errs = data.errors
  if (errs && typeof errs === 'object') {
    const first = Object.values(errs as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return String(first[0])
  }
  return 'Request failed.'
}

export type FetchTasksResult =
  | { ok: true; tasks: Task[] }
  | { ok: false; unauthorized: true }
  | { ok: false; error: string }
  | { ok: false; aborted: true }

export async function fetchTasksForUser(signal?: AbortSignal): Promise<FetchTasksResult> {
  try {
    const res = await apiFetch('/api/tasks', { signal })
    if (res.status === 401) return { ok: false, unauthorized: true }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
      return {
        ok: false,
        error: errorMessageFromBody(err),
      }
    }
    const rows = (await res.json()) as ApiTaskRow[]
    return { ok: true, tasks: rows.map(mapApiTask) }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, aborted: true }
    }
    if (e instanceof TypeError) {
      return {
        ok: false,
        error:
          'Network error — is the API running? Check VITE_API_URL and that the backend is up.',
      }
    }
    throw e
  }
}

export type CreateTaskResult =
  | { ok: true; task: Task }
  | { ok: false; error: string }

export async function createTaskApi(input: {
  title: string
  description: string
  dueDate: string
  priority: TaskPriority
  assignee: string
}): Promise<CreateTaskResult> {
  try {
    const res = await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        description: input.description,
        due_date: input.dueDate,
        priority: input.priority,
        assignee: input.assignee,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return { ok: false, error: errorMessageFromBody(data) }
    }
    const row = data as unknown as ApiTaskRow
    if (!row.id || row.user_id == null) {
      return { ok: false, error: 'Invalid response from server.' }
    }
    return { ok: true, task: mapApiTask(row) }
  } catch (e) {
    if (e instanceof TypeError) {
      return {
        ok: false,
        error:
          'Network error — is the API running? Check VITE_API_URL and that the backend is up.',
      }
    }
    throw e
  }
}

export async function updateTaskStatusApi(
  taskId: string,
  status: TaskStatus,
): Promise<boolean> {
  const res = await apiFetch(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  return res.ok
}

export async function completeTaskApi(taskId: string): Promise<boolean> {
  return updateTaskStatusApi(taskId, 'done')
}

export async function deleteTaskApi(taskId: string): Promise<boolean> {
  const res = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
  return res.ok
}
