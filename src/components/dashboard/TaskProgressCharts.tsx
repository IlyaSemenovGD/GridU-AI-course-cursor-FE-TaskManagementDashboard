import type { Task } from '../../types'

type TaskProgressChartsProps = {
  tasks: Task[]
}

export function TaskProgressCharts({ tasks }: TaskProgressChartsProps) {
  const todo = tasks.filter((t) => t.status === 'todo').length
  const progress = tasks.filter((t) => t.status === 'in-progress').length
  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const maxBar = Math.max(todo, progress, done, 1)

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
      aria-labelledby="task-charts-heading"
      data-testid="task-progress-charts"
    >
      <h3
        id="task-charts-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Task progress
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Distribution by status in your workspace list
      </p>

      {total > 0 ? (
        <div
          className="mt-4 flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="img"
          aria-label={`Status split: ${pct(todo)}% to do, ${pct(progress)}% in progress, ${pct(done)}% done`}
        >
          {todo > 0 ? (
            <div
              className="bg-zinc-400 dark:bg-zinc-500"
              style={{ width: `${(todo / total) * 100}%` }}
            />
          ) : null}
          {progress > 0 ? (
            <div className="bg-amber-500" style={{ width: `${(progress / total) * 100}%` }} />
          ) : null}
          {done > 0 ? (
            <div
              className="bg-emerald-500"
              style={{ width: `${(done / total) * 100}%` }}
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No tasks to chart yet.</p>
      )}

      {total > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" aria-hidden />
            To do {pct(todo)}%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
            In progress {pct(progress)}%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            Done {pct(done)}%
          </li>
        </ul>
      ) : null}

      <div className="mt-6 space-y-3" role="list">
        <ChartRow
          label="To do"
          count={todo}
          max={maxBar}
          barClass="bg-zinc-400 dark:bg-zinc-500"
        />
        <ChartRow
          label="In progress"
          count={progress}
          max={maxBar}
          barClass="bg-amber-500"
        />
        <ChartRow
          label="Done"
          count={done}
          max={maxBar}
          barClass="bg-emerald-500"
        />
      </div>
    </section>
  )
}

function ChartRow({
  label,
  count,
  max,
  barClass,
}: {
  label: string
  count: number
  max: number
  barClass: string
}) {
  const w = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div role="listitem">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barClass}`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  )
}
