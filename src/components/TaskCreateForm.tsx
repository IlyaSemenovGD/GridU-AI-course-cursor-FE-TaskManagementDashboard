import { useId, useState } from 'react'
import type { TaskPriority } from '../types'

type TaskCreateFormProps = {
  onCreate: (input: {
    title: string
    description: string
    dueDate: string
    priority: TaskPriority
  }) => void
}

export function TaskCreateForm({ onCreate }: TaskCreateFormProps) {
  const formId = useId()
  const defaultDue = new Date()
  defaultDue.setDate(defaultDue.getDate() + 7)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(defaultDue.toISOString().slice(0, 10))
  const [priority, setPriority] = useState<TaskPriority>('medium')

  return (
    <form
      data-testid="task-create-form"
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        onCreate({ title, description, dueDate, priority })
        setTitle('')
        setDescription('')
      }}
    >
      <h3 id={`${formId}-heading`} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        New task
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-title`} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Title
          </label>
          <input
            id={`${formId}-title`}
            data-testid="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${formId}-desc`} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Description
          </label>
          <textarea
            id={`${formId}-desc`}
            data-testid="task-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-due`} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Due date
          </label>
          <input
            id={`${formId}-due`}
            data-testid="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </div>
        <div>
          <label htmlFor={`${formId}-pri`} className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Priority
          </label>
          <select
            id={`${formId}-pri`}
            data-testid="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          data-testid="task-submit"
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Add task
        </button>
      </div>
    </form>
  )
}
