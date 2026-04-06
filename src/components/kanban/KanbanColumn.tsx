import type { DragEvent } from 'react'
import type { Task, TaskStatus } from '../../types'
import { KanbanTaskCard } from './KanbanTaskCard'
import type { KanbanDragPayload } from './kanbanDnD'

type KanbanColumnProps = {
  status: TaskStatus
  title: string
  hint: string
  tasks: Task[]
  draggingTaskId: string | null
  isDropTarget: boolean
  onDragStartCard: (payload: KanbanDragPayload) => void
  onDragEndCard: () => void
  onDragOverColumn: (status: TaskStatus) => void
  onDropOnColumn: (status: TaskStatus, e: DragEvent) => void
}

export function KanbanColumn({
  status,
  title,
  hint,
  tasks,
  draggingTaskId,
  isDropTarget,
  onDragStartCard,
  onDragEndCard,
  onDragOverColumn,
  onDropOnColumn,
}: KanbanColumnProps) {
  return (
    <section
      className={`flex min-h-[12rem] flex-col rounded-2xl border bg-zinc-50/80 dark:bg-zinc-900/40 ${
        isDropTarget
          ? 'border-violet-500 ring-2 ring-violet-500/30 dark:border-violet-400'
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
      data-kanban-column={status}
      data-dnd-drop-zone="native-html5"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOverColumn(status)
      }}
      onDrop={(e) => onDropOnColumn(status, e)}
    >
      <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
          <span
            className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-xs font-medium tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            aria-label={`${tasks.length} tasks`}
          >
            {tasks.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {tasks.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 py-8 text-center text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-500">
            Drop tasks here
          </p>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              isDragging={draggingTaskId === task.id}
              onDragStart={onDragStartCard}
              onDragEnd={onDragEndCard}
            />
          ))
        )}
      </div>
    </section>
  )
}
