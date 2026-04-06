type ProjectOverviewProps = {
  projectName: string
  description: string
  completionPercent: number
  dueLabel: string
  activeTaskCount: number
}

export function ProjectOverview({
  projectName,
  description,
  completionPercent,
  dueLabel,
  activeTaskCount,
}: ProjectOverviewProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950"
      aria-labelledby="project-overview-heading"
      data-testid="project-overview"
    >
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="project-overview-heading"
              className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              {projectName}
            </h2>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950/80 dark:text-violet-200">
              Active
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
          <dl className="mt-4 flex flex-wrap gap-4 text-sm">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Target</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">{dueLabel}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-500">Open work</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">{activeTaskCount} tasks</dd>
            </div>
          </dl>
        </div>
        <div
          className="flex shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-900/80"
          role="group"
          aria-label={`Project completion ${completionPercent} percent`}
        >
          <div
            className="relative flex h-24 w-24 items-center justify-center"
            aria-hidden
          >
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-zinc-200 dark:stroke-zinc-700"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                className="stroke-violet-500"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${completionPercent * 0.974}, 100`}
                pathLength={100}
              />
            </svg>
            <span className="absolute text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {completionPercent}%
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Complete</p>
        </div>
      </div>
    </section>
  )
}
