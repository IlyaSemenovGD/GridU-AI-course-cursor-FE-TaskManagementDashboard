import type { Task } from '../types'

const prefix = 'tm-tasks-'

function keyForUser(userId: string) {
  return `${prefix}${userId}`
}

export function loadTasksForUser(userId: string): Task[] {
  try {
    const raw = localStorage.getItem(keyForUser(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Task[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTasksForUser(userId: string, tasks: Task[]) {
  localStorage.setItem(keyForUser(userId), JSON.stringify(tasks))
}

export function createTask(
  userId: string,
  input: Pick<Task, 'title' | 'description' | 'dueDate' | 'priority'> & {
    assignee?: string
  },
): Task {
  const assignee = input.assignee?.trim() || 'Me'
  return {
    id: crypto.randomUUID(),
    userId,
    title: input.title.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate,
    priority: input.priority,
    status: 'todo',
    assignee,
  }
}
