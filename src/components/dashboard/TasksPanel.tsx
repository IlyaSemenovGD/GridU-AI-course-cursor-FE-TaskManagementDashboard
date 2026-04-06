import { TaskCard } from '../TaskCard'
import { TaskCreateForm } from '../TaskCreateForm'
import type { Task } from '../../types'

type TasksPanelProps = {
  tasks: Task[]
  onCreate: Parameters<typeof TaskCreateForm>[0]['onCreate']
  onComplete: (id: string) => void
  onDelete: (id: string) => void
}

export function TasksPanel({ tasks, onCreate, onComplete, onDelete }: TasksPanelProps) {
  return (
    <>
      <div className="mt-10">
        <TaskCreateForm onCreate={onCreate} />
      </div>

      <section className="mt-10" aria-labelledby="tasks-heading">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3
              id="tasks-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Your tasks
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create, complete, or remove tasks
            </p>
          </div>
        </div>

        {tasks.length === 0 ? (
          <p
            data-testid="tasks-empty"
            className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
          >
            No tasks yet. Add one above.
          </p>
        ) : (
          <ul
            data-testid="task-list"
            className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
          >
            {tasks.map((task) => (
              <li key={task.id}>
                <TaskCard
                  task={task}
                  onMarkComplete={() => onComplete(task.id)}
                  onDelete={() => onDelete(task.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
