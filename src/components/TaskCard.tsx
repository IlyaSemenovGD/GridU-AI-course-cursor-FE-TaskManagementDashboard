import type { Task } from '../types'

const priorityStyles: Record<
  Task['priority'],
  { label: string; className: string }
> = {
  low: {
    label: 'Low',
    className:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200',
  },
  medium: {
    label: 'Medium',
    className:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200',
  },
  high: {
    label: 'High',
    className: 'bg-rose-100 text-rose-900 dark:bg-rose-950/80 dark:text-rose-200',
  },
}

const statusLabels: Record<Task['status'], string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
}

type TaskCardProps = {
  task: Task
  onMarkComplete?: () => void
  onDelete?: () => void
}

export function TaskCard({ task, onMarkComplete, onDelete }: TaskCardProps) {
  const p = priorityStyles[task.priority]
  const due = new Date(task.dueDate)
  const formatted = due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const initials = task.assignee
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      data-testid="task-card"
      data-task-id={task.id}
      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-violet-500 focus-within:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:ring-offset-zinc-950 sm:p-5"
      aria-labelledby={`task-title-${task.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3
          id={`task-title-${task.id}`}
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {task.title}
        </h3>
        <span
          className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${p.className}`}
        >
          {p.label}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {task.description}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <IconCalendarSmall className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
          <time dateTime={task.dueDate}>Due {formatted}</time>
        </span>
        <span className="hidden sm:inline" aria-hidden>
          ·
        </span>
        <span data-testid="task-status">{statusLabels[task.status]}</span>
        <span
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
          title={task.assignee}
          aria-label={`Assignee: ${task.assignee}`}
        >
          {initials}
        </span>
      </div>
      {(onMarkComplete || onDelete) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          {task.status !== 'done' && onMarkComplete ? (
            <button
              type="button"
              data-testid="task-mark-complete"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={onMarkComplete}
              aria-label={`Mark complete: ${task.title}`}
            >
              Mark complete
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              data-testid="task-delete"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70"
              onClick={onDelete}
              aria-label={`Delete task: ${task.title}`}
            >
              Delete
            </button>
          ) : null}
        </div>
      )}
    </article>
  )
}

function IconCalendarSmall(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}
