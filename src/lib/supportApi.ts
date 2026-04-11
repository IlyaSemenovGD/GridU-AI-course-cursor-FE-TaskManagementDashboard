import type {
  SupportAgent,
  SupportTicket,
  TicketComment,
} from '../types/support'
import { apiFetch } from './apiClient'

function errorMessageFromBody(data: Record<string, unknown>): string {
  if (typeof data.message === 'string') return data.message
  const errs = data.errors
  if (errs && typeof errs === 'object') {
    const first = Object.values(errs as Record<string, string[]>)[0]
    if (Array.isArray(first) && first[0]) return String(first[0])
  }
  return 'Request failed.'
}

export type ListTicketsResult =
  | { ok: true; tickets: SupportTicket[]; total: number; page: number }
  | { ok: false; error: string; unauthorized?: boolean }

export async function fetchSupportTickets(
  signal?: AbortSignal,
  params?: Record<string, string | number | undefined>,
): Promise<ListTicketsResult> {
  try {
    const sp = new URLSearchParams()
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') sp.set(k, String(v))
      }
    }
    const q = sp.toString()
    const path = q ? `/api/tickets?${q}` : '/api/tickets'
    const res = await apiFetch(path, { signal })
    if (res.status === 401) return { ok: false, error: 'Unauthorized', unauthorized: true }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return { ok: false, error: errorMessageFromBody(data) }
    }
    const tickets = (data.tickets as SupportTicket[]) ?? []
    const total = typeof data.total === 'number' ? data.total : tickets.length
    const page = typeof data.page === 'number' ? data.page : 1
    return { ok: true, tickets, total, page }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { ok: false, error: 'Aborted' }
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

export async function createSupportTicket(input: {
  subject: string
  description: string
  priority: string
  category: string
  customer_email: string
  auto_assign?: boolean
  /** Optional files (max 3); sent as multipart so uploads happen in the same request as create. */
  files?: File[]
}): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  try {
    const files = input.files?.filter(Boolean) ?? []
    const useMultipart = files.length > 0
    const res = await apiFetch('/api/tickets', {
      method: 'POST',
      body: useMultipart
        ? (() => {
            const fd = new FormData()
            fd.set('subject', input.subject)
            fd.set('description', input.description)
            fd.set('priority', input.priority)
            fd.set('category', input.category)
            fd.set('customer_email', input.customer_email)
            fd.set('auto_assign', String(input.auto_assign ?? true))
            for (const f of files.slice(0, 3)) {
              fd.append('file', f)
            }
            return fd
          })()
        : JSON.stringify({
            subject: input.subject,
            description: input.description,
            priority: input.priority,
            category: input.category,
            customer_email: input.customer_email,
            auto_assign: input.auto_assign ?? true,
          }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
    return { ok: true, ticket: data as unknown as SupportTicket }
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

export async function updateTicketStatus(
  ticketId: number,
  status: string,
  note?: string | null,
): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${ticketId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, note: note ?? null }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  return { ok: true, ticket: data as unknown as SupportTicket }
}

export async function updateTicketPriority(
  ticketId: number,
  priority: string,
  reason: string,
): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${ticketId}/priority`, {
    method: 'PUT',
    body: JSON.stringify({ priority, reason }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  return { ok: true, ticket: data as unknown as SupportTicket }
}

export async function assignTicket(
  ticketId: number,
  agentId: number,
): Promise<{ ok: true; ticket: SupportTicket } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${ticketId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ agent_id: agentId }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  return { ok: true, ticket: data as unknown as SupportTicket }
}

export async function deleteSupportTicket(
  ticketId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${ticketId}`, { method: 'DELETE' })
  if (res.ok) return { ok: true }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: false, error: errorMessageFromBody(data) }
}

export async function fetchTicketComments(
  ticketId: number,
): Promise<{ ok: true; comments: TicketComment[] } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${ticketId}/comments`)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  const comments = (data.comments as TicketComment[]) ?? []
  return { ok: true, comments }
}

export async function addTicketComment(input: {
  ticketId: number
  content: string
  is_internal?: boolean
}): Promise<{ ok: true; comment: TicketComment } | { ok: false; error: string }> {
  const res = await apiFetch(`/api/tickets/${input.ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: input.content,
      is_internal: input.is_internal ?? false,
      mention_user_ids: [],
    }),
  })
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  return { ok: true, comment: data as unknown as TicketComment }
}

export async function fetchAgents(): Promise<
  { ok: true; agents: SupportAgent[] } | { ok: false; error: string }
> {
  const res = await apiFetch('/api/agents')
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) return { ok: false, error: errorMessageFromBody(data) }
  const agents = (data.agents as SupportAgent[]) ?? []
  return { ok: true, agents }
}
