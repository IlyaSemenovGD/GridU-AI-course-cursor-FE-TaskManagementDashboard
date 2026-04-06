import type { ActivityItem } from '../../types/dashboard'

const typeLabel: Record<ActivityItem['type'], string> = {
  task_created: 'Created',
  task_completed: 'Completed',
  task_deleted: 'Removed',
  task_moved: 'Moved',
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )

  return (
    <section
      className="flex max-h-[min(24rem,50vh)] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-labelledby="activity-feed-heading"
      data-testid="activity-feed"
    >
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <h3
          id="activity-feed-heading"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Recent activity
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Latest updates from your team workspace
        </p>
      </div>
      <ul
        className="custom-scrollbar max-h-80 flex-1 list-none space-y-0 overflow-y-auto p-2 sm:max-h-96 sm:p-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {sorted.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No activity yet. Create or complete a task to see updates here.
          </li>
        ) : (
          sorted.slice(0, 25).map((a) => {
            const time = new Date(a.at)
            const timeStr = time.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
            return (
              <li key={a.id}>
                <article className="rounded-lg px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/80">
                  <div className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                      aria-hidden
                    >
                      {typeLabel[a.type].slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-800 dark:text-zinc-200">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {a.actorName}
                        </span>{' '}
                        <span className="text-zinc-600 dark:text-zinc-400">{a.message}</span>
                      </p>
                      <time
                        className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-500"
                        dateTime={a.at}
                      >
                        {timeStr}
                      </time>
                    </div>
                  </div>
                </article>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
