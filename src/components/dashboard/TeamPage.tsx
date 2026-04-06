import { mergeTeamWithUser, TEAM_MEMBERS } from '../../data/team'
import { TeamAvatars } from './TeamAvatars'

type TeamPageProps = {
  currentUserName: string
}

export function TeamPage({ currentUserName }: TeamPageProps) {
  const members = mergeTeamWithUser(TEAM_MEMBERS, currentUserName)

  return (
    <div className="mx-auto max-w-4xl space-y-8" data-testid="team-page">
      <header>
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Team</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          People in the Product workspace. Invite teammates to collaborate on tasks.
        </p>
      </header>
      <TeamAvatars members={members} currentUserName={currentUserName} variant="grid" />
      <section
        className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50"
        aria-labelledby="invite-heading"
      >
        <h3 id="invite-heading" className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Invite a teammate
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Email invites and role management will appear here in a future release.
        </p>
      </section>
    </div>
  )
}
