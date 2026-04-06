import type { ReactNode } from 'react'

type StatWidgetProps = {
  statId: string
  label: string
  value: string | number
  hint?: string
  icon: ReactNode
}

export function StatWidget({ statId, label, value, hint, icon }: StatWidgetProps) {
  const headingId = `stat-heading-${statId}`
  return (
    <article
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-5"
      aria-labelledby={headingId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            id={headingId}
            className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
          >
            {label}
          </h3>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50 sm:text-3xl">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
          ) : null}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300"
          aria-hidden
        >
          {icon}
        </div>
      </div>
    </article>
  )
}
