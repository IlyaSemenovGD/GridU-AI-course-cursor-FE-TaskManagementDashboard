import { useCallback, useEffect, useState } from 'react'
import type { Session } from '../../lib/auth'
import {
  addTicketComment,
  assignTicket,
  createSupportTicket,
  deleteSupportTicket,
  fetchAgents,
  fetchSupportTickets,
  fetchTicketComments,
  updateTicketPriority,
  updateTicketStatus,
} from '../../lib/supportApi'
import type { SupportAgent, SupportTicket, TicketComment } from '../../types/support'
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../../types/support'

type Props = {
  session: Session
  onUnauthorized: () => void
}

function badgeClass(kind: 'status' | 'priority', value: string): string {
  const base =
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset'
  if (kind === 'priority') {
    if (value === 'urgent') return `${base} bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300`
    if (value === 'high')
      return `${base} bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-950/50 dark:text-orange-200`
    if (value === 'medium')
      return `${base} bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200`
    return `${base} bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300`
  }
  return `${base} bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-200`
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ')
}

export function SupportTicketsPanel({ session, onUnauthorized }: Props) {
  const role = session.role ?? 'customer'
  const isStaff = role === 'agent' || role === 'admin'
  const isAdmin = role === 'admin'

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentInternal, setCommentInternal] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [agents, setAgents] = useState<SupportAgent[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const [priorityReason, setPriorityReason] = useState('')
  const [priorityDraft, setPriorityDraft] = useState('medium')
  const [statusFilter, setStatusFilter] = useState('')

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  useEffect(() => {
    if (selected) setPriorityDraft(selected.priority)
  }, [selected?.id, selected?.priority])

  const loadList = useCallback(async () => {
    setLoading(true)
    setListError(null)
    const r = await fetchSupportTickets(undefined, {
      per_page: 50,
      ...(statusFilter ? { status: statusFilter } : {}),
    })
    setLoading(false)
    if (!r.ok) {
      if (r.unauthorized) {
        onUnauthorized()
        return
      }
      setListError(r.error)
      return
    }
    setTickets(r.tickets)
    setTotal(r.total)
  }, [onUnauthorized, statusFilter])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!isAdmin) return
    void (async () => {
      const r = await fetchAgents()
      if (r.ok) setAgents(r.agents)
    })()
  }, [isAdmin])

  useEffect(() => {
    if (selectedId == null) {
      setComments([])
      return
    }
    setCommentsLoading(true)
    void (async () => {
      const r = await fetchTicketComments(selectedId)
      setCommentsLoading(false)
      if (r.ok) setComments(r.comments)
      else setComments([])
    })()
  }, [selectedId])

  const handleCreate = async (input: {
    subject: string
    description: string
    priority: string
    category: string
    customer_email: string
  }) => {
    setCreateError(null)
    const r = await createSupportTicket({
      ...input,
      auto_assign: true,
    })
    if (!r.ok) {
      setCreateError(r.error)
      return false
    }
    await loadList()
    setSelectedId(r.ticket.id)
    return true
  }

  const handleStatus = async (status: string) => {
    if (!selected) return
    setActionError(null)
    const r = await updateTicketStatus(selected.id, status)
    if (!r.ok) {
      setActionError(r.error)
      return
    }
    setTickets((prev) => prev.map((t) => (t.id === r.ticket.id ? r.ticket : t)))
  }

  const handlePriorityApply = async () => {
    if (!selected) return
    if (!priorityReason.trim()) {
      setActionError('Enter a reason when changing priority.')
      return
    }
    if (priorityDraft === selected.priority) {
      setActionError('Choose a different priority or clear the form.')
      return
    }
    setActionError(null)
    const r = await updateTicketPriority(selected.id, priorityDraft, priorityReason.trim())
    if (!r.ok) {
      setActionError(r.error)
      return
    }
    setPriorityReason('')
    setTickets((prev) => prev.map((t) => (t.id === r.ticket.id ? r.ticket : t)))
  }

  const handleAssign = async (agentId: number) => {
    if (!selected) return
    setActionError(null)
    const r = await assignTicket(selected.id, agentId)
    if (!r.ok) {
      setActionError(r.error)
      return
    }
    setTickets((prev) => prev.map((t) => (t.id === r.ticket.id ? r.ticket : t)))
  }

  const handleDelete = async () => {
    if (!selected || !isAdmin) return
    if (!window.confirm(`Delete ticket ${selected.ticket_number}?`)) return
    setActionError(null)
    const r = await deleteSupportTicket(selected.id)
    if (!r.ok) {
      setActionError(r.error)
      return
    }
    setSelectedId(null)
    await loadList()
  }

  const handleAddComment = async () => {
    if (!selected || !commentText.trim()) return
    setCommentError(null)
    const r = await addTicketComment({
      ticketId: selected.id,
      content: commentText.trim(),
      is_internal: isStaff ? commentInternal : false,
    })
    if (!r.ok) {
      setCommentError(r.error)
      return
    }
    setCommentText('')
    setCommentInternal(false)
    const cr = await fetchTicketComments(selected.id)
    if (cr.ok) setComments(cr.comments)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8" data-testid="support-tickets-panel">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Queue &amp; requests
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Create requests, track status, and communicate with support. Connected to{' '}
          <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-900">/api/tickets</code>
          .
        </p>
      </header>

      <SupportTicketCreateForm
        session={session}
        error={createError}
        onSubmit={handleCreate}
        onErrorClear={() => setCreateError(null)}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          aria-labelledby="ticket-list-heading"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 id="ticket-list-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Your queue ({total})
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs text-zinc-500">
                Status
                <select
                  className="ml-1 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
                onClick={() => void loadList()}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading && <p className="text-sm text-zinc-500">Loading…</p>}
          {listError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          )}
          {!loading && !listError && tickets.length === 0 && (
            <p className="text-sm text-zinc-500">No tickets yet. Create one above.</p>
          )}
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tickets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`flex w-full flex-col gap-1 px-2 py-3 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    selectedId === t.id
                      ? 'bg-violet-50 dark:bg-violet-950/40'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/80'
                  }`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-violet-600 dark:text-violet-400">
                      {t.ticket_number}
                    </span>
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{t.subject}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1">
                    <span className={badgeClass('status', t.status)}>{formatLabel(t.status)}</span>
                    <span className={badgeClass('priority', t.priority)}>{t.priority}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="w-full shrink-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:max-w-md xl:max-w-lg"
          aria-label="Ticket detail"
        >
          {!selected && (
            <p className="text-sm text-zinc-500">Select a ticket to view details and comments.</p>
          )}
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs text-violet-600 dark:text-violet-400">
                  {selected.ticket_number}
                </p>
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{selected.subject}</h4>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                  {selected.description}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <div>
                  <dt className="font-medium text-zinc-500">Customer</dt>
                  <dd className="truncate">{selected.customer_email}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-500">Category</dt>
                  <dd>{formatLabel(selected.category)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-500">Created</dt>
                  <dd>{new Date(selected.created_at).toLocaleString()}</dd>
                </div>
                {selected.assigned_to_id != null && (
                  <div>
                    <dt className="font-medium text-zinc-500">Assigned to (id)</dt>
                    <dd>{selected.assigned_to_id}</dd>
                  </div>
                )}
              </dl>

              {(selected.sla_response_breached || selected.sla_resolution_breached) && (
                <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  SLA warning:{' '}
                  {selected.sla_response_breached ? 'first response ' : ''}
                  {selected.sla_resolution_breached ? 'resolution ' : ''}
                  overdue
                </p>
              )}

              {actionError && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {actionError}
                </p>
              )}

              {isStaff && (
                <div className="space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Staff actions</p>
                  <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                    Update status
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      value={selected.status}
                      onChange={(e) => void handleStatus(e.target.value)}
                    >
                      {TICKET_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                      Change priority (requires reason)
                    </label>
                    <div className="mt-1 flex flex-col gap-2">
                      <select
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={priorityDraft}
                        onChange={(e) => setPriorityDraft(e.target.value)}
                      >
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Reason for change"
                        className="w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        value={priorityReason}
                        onChange={(e) => setPriorityReason(e.target.value)}
                      />
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                        onClick={() => void handlePriorityApply()}
                      >
                        Apply priority change
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                  <label className="block text-xs text-zinc-600 dark:text-zinc-400">
                    Assign to agent
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      value=""
                      onChange={(e) => {
                        const id = Number(e.target.value)
                        if (id) void handleAssign(id)
                        e.target.value = ''
                      }}
                    >
                      <option value="">Select agent…</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.full_name || a.username} ({a.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950"
                    onClick={() => void handleDelete()}
                  >
                    Delete ticket (admin)
                  </button>
                </div>
              )}

              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Comments</h5>
                {commentsLoading && <p className="text-sm text-zinc-500">Loading comments…</p>}
                <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/80"
                    >
                      {c.is_internal && (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Internal · user #{c.user_id}
                        </span>
                      )}
                      {!c.is_internal && (
                        <span className="text-xs text-zinc-500">User #{c.user_id} · </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                      <p className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                        {c.content}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 space-y-2">
                  {isStaff && (
                    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        checked={commentInternal}
                        onChange={(e) => setCommentInternal(e.target.checked)}
                      />
                      Internal note (hidden from customer)
                    </label>
                  )}
                  <textarea
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    rows={3}
                    placeholder="Write a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  {commentError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{commentError}</p>
                  )}
                  <button
                    type="button"
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                    onClick={() => void handleAddComment()}
                  >
                    Add comment
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SupportTicketCreateForm({
  session,
  error,
  onSubmit,
  onErrorClear,
}: {
  session: Session
  error: string | null
  onSubmit: (input: {
    subject: string
    description: string
    priority: string
    category: string
    customer_email: string
  }) => Promise<boolean>
  onErrorClear: () => void
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [category, setCategory] = useState('general')
  const [email, setEmail] = useState(session.email)
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onErrorClear()
    setBusy(true)
    const ok = await onSubmit({
      subject: subject.trim(),
      description: description.trim(),
      priority,
      category,
      customer_email: email.trim().toLowerCase(),
    })
    setBusy(false)
    if (ok) {
      setSubject('')
      setDescription('')
      setPriority('medium')
      setCategory('general')
      setEmail(session.email)
    }
  }

  return (
    <form
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      onSubmit={(e) => void handleSubmit(e)}
      data-testid="support-ticket-create-form"
    >
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New ticket</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Subject 5–200 chars; description at least 20 characters.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Subject</span>
          <input
            required
            minLength={5}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Contact email</span>
          <input
            required
            type="email"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Priority</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Category</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Description</span>
        <textarea
          required
          minLength={20}
          maxLength={5000}
          rows={4}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {busy ? 'Submitting…' : 'Submit ticket'}
      </button>
    </form>
  )
}
