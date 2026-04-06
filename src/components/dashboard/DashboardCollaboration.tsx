import { mergeTeamWithUser, TEAM_MEMBERS } from '../../data/team'
import type { ActivityItem } from '../../types/dashboard'
import type { Task } from '../../types'
import { ActivityFeed } from './ActivityFeed'
import { DashboardStats } from './DashboardStats'
import { TeamAvatars } from './TeamAvatars'
import { ProjectOverview } from './ProjectOverview'
import { QuickActions } from './QuickActions'
import { TaskProgressCharts } from './TaskProgressCharts'
import { TasksPanel } from './TasksPanel'
import type { ReactNode } from 'react'

type DashboardCollaborationProps = {
  tasks: Task[]
  activities: ActivityItem[]
  currentUserName: string
  total: number
  inProgress: number
  completed: number
  dueSoon: number
  completionPercent: number
  activeTaskCount: number
  statIcons: {
    list: ReactNode
    activity: ReactNode
    check: ReactNode
    clock: ReactNode
  }
  onCreateTask: Parameters<typeof TasksPanel>[0]['onCreate']
  onCompleteTask: (id: string) => void
  onDeleteTask: (id: string) => void
  onQuickNewTask: () => void
  onNavigateTeam: () => void
  onNavigateSettings: () => void
}

export function DashboardCollaboration({
  tasks,
  activities,
  currentUserName,
  total,
  inProgress,
  completed,
  dueSoon,
  completionPercent,
  activeTaskCount,
  statIcons,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  onQuickNewTask,
  onNavigateTeam,
  onNavigateSettings,
}: DashboardCollaborationProps) {
  const team = mergeTeamWithUser(TEAM_MEMBERS, currentUserName)

  return (
    <div
      className="mx-auto max-w-7xl space-y-8"
      data-testid="dashboard-content"
    >
      <h2 className="sr-only">Collaboration overview and tasks</h2>

      <ProjectOverview
        projectName="Product workspace — Q2 launch"
        description="Cross-functional initiative covering onboarding polish, analytics, and release readiness. Use tasks below to coordinate execution."
        completionPercent={completionPercent}
        dueLabel="June 30, 2026"
        activeTaskCount={activeTaskCount}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <QuickActions
          onNewTask={onQuickNewTask}
          onOpenTeam={onNavigateTeam}
          onOpenSettings={onNavigateSettings}
        />
        <TeamAvatars members={team} currentUserName={currentUserName} variant="strip" />
      </div>

      <DashboardStats
        total={total}
        inProgress={inProgress}
        completed={completed}
        dueSoon={dueSoon}
        icons={statIcons}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <TaskProgressCharts tasks={tasks} />
        <ActivityFeed items={activities} />
      </div>

      <TasksPanel
        tasks={tasks}
        onCreate={onCreateTask}
        onComplete={onCompleteTask}
        onDelete={onDeleteTask}
      />
    </div>
  )
}
