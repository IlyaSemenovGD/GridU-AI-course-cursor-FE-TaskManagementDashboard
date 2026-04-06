import { useCallback, useEffect, useState, type DragEvent } from 'react'
import type { Task, TaskStatus } from '../../types'
import { KanbanColumn } from './KanbanColumn'
import { parseKanbanPayload, type KanbanDragPayload } from './kanbanDnD'

type KanbanBoardProps = {
  tasks: Task[]
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

const COLUMNS: {
  status: TaskStatus
  title: string
  hint: string
}[] = [
  {
    status: 'todo',
    title: 'To do',
    hint: 'New work waiting to be started',
  },
  {
    status: 'in-progress',
    title: 'In progress',
    hint: 'Actively being worked on',
  },
  { status: 'done', title: 'Done', hint: 'Completed items' },
]

export function KanbanBoard({ tasks, onTaskStatusChange }: KanbanBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<TaskStatus | null>(null)

  useEffect(() => {
    const clear = () => {
      setDraggingTaskId(null)
      setDropTargetStatus(null)
    }
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [])

  const onDragStartCard = useCallback((payload: KanbanDragPayload) => {
    setDraggingTaskId(payload.taskId)
  }, [])

  const onDragEndCard = useCallback(() => {
    setDraggingTaskId(null)
    setDropTargetStatus(null)
  }, [])

  const onDropOnColumn = useCallback(
    (columnStatus: TaskStatus, e: DragEvent) => {
      e.preventDefault()
      const payload = parseKanbanPayload(e.dataTransfer)
      if (payload) onTaskStatusChange(payload.taskId, columnStatus)
      setDropTargetStatus(null)
      setDraggingTaskId(null)
    },
    [onTaskStatusChange],
  )

  return (
    <div
      className="mx-auto max-w-7xl"
      data-testid="kanban-board"
      data-dnd-strategy="native-html5"
    >
      <div className="mb-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Drag cards between columns to update status.{' '}
          <span className="sr-only">
            For touch devices or keyboard reordering, integrate a library such as dnd-kit
            using the data-dnd-drop-zone markers on columns.
          </span>
        </p>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
        {COLUMNS.map((col) => (
          <div
            key={col.status}
            className="min-w-[min(100%,280px)] snap-start flex-1 lg:min-w-0"
          >
            <KanbanColumn
              status={col.status}
              title={col.title}
              hint={col.hint}
              tasks={tasks.filter((t) => t.status === col.status)}
              draggingTaskId={draggingTaskId}
              isDropTarget={dropTargetStatus === col.status}
              onDragStartCard={onDragStartCard}
              onDragEndCard={onDragEndCard}
              onDragOverColumn={setDropTargetStatus}
              onDropOnColumn={onDropOnColumn}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
