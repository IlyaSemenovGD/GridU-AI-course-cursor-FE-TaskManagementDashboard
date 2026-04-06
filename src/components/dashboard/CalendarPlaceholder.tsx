export function CalendarPlaceholder() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const cells = Array.from({ length: 28 }, (_, i) => i + 1)

  return (
    <div className="mx-auto max-w-5xl" data-testid="calendar-placeholder">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Calendar</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Month view placeholder — connect a calendar backend to show real deadlines.
        </p>
      </header>
      <div
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        role="grid"
        aria-label="Example month calendar"
      >
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/80">
          {days.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
              role="columnheader"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800">
          {cells.map((day) => (
            <div
              key={day}
              className="min-h-[4rem] bg-white p-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              role="gridcell"
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
