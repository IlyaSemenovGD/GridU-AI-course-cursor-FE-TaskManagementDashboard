import type { TeamMember } from '../../types/dashboard'

type TeamAvatarsProps = {
  members: TeamMember[]
  currentUserName: string
  variant?: 'strip' | 'grid'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function TeamAvatars({
  members,
  currentUserName,
  variant = 'strip',
}: TeamAvatarsProps) {
  const listClass =
    variant === 'strip'
      ? 'flex flex-wrap items-center gap-2 sm:gap-3'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-3'

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
      aria-labelledby="team-avatars-heading"
      data-testid="team-avatars"
    >
      <h3
        id="team-avatars-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Team
      </h3>
      <ul className={`mt-4 ${listClass}`}>
        {members.map((m, i) => {
          const isYou = m.name === currentUserName
          return (
            <li
              key={m.id}
              className={
                variant === 'strip' && i > 0 ? '-ml-2 first:ml-0 sm:-ml-3 sm:first:ml-0' : ''
              }
              style={variant === 'strip' ? { zIndex: members.length - i } : undefined}
            >
              <div
                className={`flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-950/50 ${
                  variant === 'strip' ? 'shadow-sm ring-2 ring-white dark:ring-zinc-900' : ''
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${m.accentClass}`}
                  aria-hidden
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {m.name}
                    {isYou ? (
                      <span className="ml-1.5 text-xs font-normal text-violet-600 dark:text-violet-400">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{m.role}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
