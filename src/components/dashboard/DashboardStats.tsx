import type { ReactNode } from 'react'
import { StatWidget } from '../StatWidget'

type DashboardStatsProps = {
  total: number
  inProgress: number
  completed: number
  dueSoon: number
  icons: {
    list: ReactNode
    activity: ReactNode
    check: ReactNode
    clock: ReactNode
  }
}

export function DashboardStats({
  total,
  inProgress,
  completed,
  dueSoon,
  icons,
}: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-stats">
      <StatWidget
        statId="total"
        label="Total tasks"
        value={total}
        hint="Across all lists"
        icon={icons.list}
      />
      <StatWidget
        statId="progress"
        label="In progress"
        value={inProgress}
        hint="Actively owned"
        icon={icons.activity}
      />
      <StatWidget
        statId="done"
        label="Completed"
        value={completed}
        hint="Marked done"
        icon={icons.check}
      />
      <StatWidget
        statId="due"
        label="Due in 7 days"
        value={dueSoon}
        hint="Excluding done"
        icon={icons.clock}
      />
    </div>
  )
}
