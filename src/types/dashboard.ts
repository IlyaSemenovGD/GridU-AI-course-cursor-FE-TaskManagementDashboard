export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_deleted'
  | 'task_moved'

export interface ActivityItem {
  id: string
  at: string
  type: ActivityType
  message: string
  actorName: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  /** Tailwind bg class for avatar circle */
  accentClass: string
}
