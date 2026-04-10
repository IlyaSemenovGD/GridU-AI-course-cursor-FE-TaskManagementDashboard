/** Support ticket API shape (Flask `/api/tickets`). */

export type UserRole = 'customer' | 'agent' | 'admin'

export type SupportTicket = {
  id: number
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  category: string
  customer_email: string
  customer_user_id: number | null
  created_by_id: number
  assigned_to_id: number | null
  first_response_at: string | null
  first_response_due_at: string | null
  resolution_due_at: string | null
  sla_response_breached: boolean
  sla_resolution_breached: boolean
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export type TicketComment = {
  id: number
  ticket_id: number
  user_id: number
  content: string
  is_internal: boolean
  created_at: string
}

export type SupportAgent = {
  id: number
  username: string
  full_name: string
  email: string
  role: string
  availability_status: string | null
  expertise_areas: string[]
}

export const TICKET_STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
  'reopened',
] as const

export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

export const TICKET_CATEGORIES = [
  'technical',
  'billing',
  'general',
  'feature_request',
] as const
