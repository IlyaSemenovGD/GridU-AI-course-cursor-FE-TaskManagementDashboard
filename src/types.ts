export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface Task {
  id: string
  /** Set for tasks owned by a logged-in user */
  userId?: string
  title: string
  description: string
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
  assignee: string
}
