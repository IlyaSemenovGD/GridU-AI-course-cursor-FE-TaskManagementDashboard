/**
 * Native HTML5 drag-and-drop payload for Kanban cards.
 * Swap to @dnd-kit/core (or similar) later for touch, keyboard, and nested scroll —
 * keep the same taskId + target status contract in `onTaskStatusChange`.
 */
export const KANBAN_MIME = 'application/x-taskflow-kanban+json'

export type KanbanDragPayload = {
  taskId: string
}

export function parseKanbanPayload(dataTransfer: DataTransfer): KanbanDragPayload | null {
  try {
    const raw = dataTransfer.getData(KANBAN_MIME)
    if (!raw) return null
    const parsed = JSON.parse(raw) as KanbanDragPayload
    return parsed?.taskId ? parsed : null
  } catch {
    return null
  }
}
