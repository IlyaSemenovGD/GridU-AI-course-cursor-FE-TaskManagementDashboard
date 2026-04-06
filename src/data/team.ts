import type { TeamMember } from '../types/dashboard'

/** Demo teammates shown alongside the signed-in user */
export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'm1', name: 'Alex Kim', role: 'Engineering', accentClass: 'bg-violet-500' },
  { id: 'm2', name: 'Jordan Lee', role: 'Design', accentClass: 'bg-sky-500' },
  { id: 'm3', name: 'Sam Rivera', role: 'Product', accentClass: 'bg-emerald-500' },
  { id: 'm4', name: 'Casey Wu', role: 'Marketing', accentClass: 'bg-amber-500' },
  { id: 'm5', name: 'Morgan Patel', role: 'QA', accentClass: 'bg-rose-500' },
]

/** Teammates plus the signed-in user when they are not already in the roster */
export function mergeTeamWithUser(
  roster: TeamMember[],
  currentUserName: string,
): TeamMember[] {
  const hasUser = roster.some(
    (m) => m.name.toLowerCase() === currentUserName.toLowerCase(),
  )
  if (hasUser) return roster
  const you: TeamMember = {
    id: 'current-user',
    name: currentUserName,
    role: 'Contributor',
    accentClass: 'bg-violet-600',
  }
  return [you, ...roster]
}
