import type { ReactNode } from 'react'
import type { Task } from '../../types'
import { DashboardStats } from './DashboardStats'
import { TasksPanel } from './TasksPanel'

type TasksWorkspaceProps = {
  tasks: Task[]
  total: number
  inProgress: number
  completed: number
  dueSoon: number
  taskCreateError?: string | null
  onCreate: Parameters<typeof TasksPanel>[0]['onCreate']
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  statIcons: {
    list: ReactNode
    activity: ReactNode
    check: ReactNode
    clock: ReactNode
  }
}

export function TasksWorkspace({
  tasks,
  total,
  inProgress,
  completed,
  dueSoon,
  taskCreateError,
  onCreate,
  onComplete,
  onDelete,
  statIcons,
}: TasksWorkspaceProps) {
  return (
    <section
      className="mx-auto max-w-7xl"
      aria-labelledby="tasks-workspace-heading"
      data-testid="tasks-workspace"
    >
      <h2 id="tasks-workspace-heading" className="sr-only">
        Tasks workspace
      </h2>

      <DashboardStats
        total={total}
        inProgress={inProgress}
        completed={completed}
        dueSoon={dueSoon}
        icons={statIcons}
      />

      <TasksPanel
        tasks={tasks}
        createError={taskCreateError}
        onCreate={onCreate}
        onComplete={onComplete}
        onDelete={onDelete}
      />
    </section>
  )
}
