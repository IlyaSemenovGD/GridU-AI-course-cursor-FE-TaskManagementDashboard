import type { ActivityItem } from '../types/dashboard'

const prefix = 'tm-activities-'

function keyForUser(userId: string) {
  return `${prefix}${userId}`
}

export function loadActivities(userId: string): ActivityItem[] {
  try {
    const raw = localStorage.getItem(keyForUser(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as ActivityItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveActivities(userId: string, items: ActivityItem[]) {
  localStorage.setItem(keyForUser(userId), JSON.stringify(items))
}
