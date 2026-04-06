import type { Task } from '../../types'
import { KANBAN_MIME, type KanbanDragPayload } from './kanbanDnD'

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

type KanbanTaskCardProps = {
  task: Task
  isDragging: boolean
  onDragStart: (payload: KanbanDragPayload) => void
  onDragEnd: () => void
}

export function KanbanTaskCard({
  task,
  isDragging,
  onDragStart,
  onDragEnd,
}: KanbanTaskCardProps) {
  const p = priorityStyles[task.priority]
  const due = new Date(task.dueDate)
  const formatted = due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  const initials = task.assignee
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      data-testid="kanban-task-card"
      data-task-id={task.id}
      draggable
      onDragStart={(e) => {
        const payload: KanbanDragPayload = { taskId: task.id }
        e.dataTransfer.setData(KANBAN_MIME, JSON.stringify(payload))
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(payload)
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-xl border border-zinc-200 bg-white p-3 shadow-sm ring-violet-500 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900 ${
        isDragging ? 'opacity-40' : ''
      } focus-visible:outline focus-visible:ring-2`}
      aria-grabbed={isDragging}
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {task.title}
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${p.className}`}
        >
          {p.label}
        </span>
      </div>
      {task.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {task.description}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <time dateTime={task.dueDate} className="tabular-nums">
          Due {formatted}
        </time>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100"
          title={task.assignee}
          aria-label={`Assignee: ${task.assignee}`}
        >
          {initials}
        </span>
      </div>
    </article>
  )
}
