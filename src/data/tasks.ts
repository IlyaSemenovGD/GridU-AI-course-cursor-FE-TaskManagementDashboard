import type { Task } from '../types'

export const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Design system audit',
    description:
      'Review color tokens, spacing scale, and component variants for consistency.',
    dueDate: '2026-04-12',
    priority: 'high',
    status: 'in-progress',
    assignee: 'Alex Kim',
  },
  {
    id: '2',
    title: 'API pagination',
    description:
      'Add cursor-based pagination to the tasks endpoint with stable ordering.',
    dueDate: '2026-04-18',
    priority: 'medium',
    status: 'todo',
    assignee: 'Jordan Lee',
  },
  {
    id: '3',
    title: 'Accessibility pass',
    description:
      'Run axe-core on critical flows and fix keyboard traps in modals.',
    dueDate: '2026-04-09',
    priority: 'high',
    status: 'todo',
    assignee: 'Sam Rivera',
  },
  {
    id: '4',
    title: 'Release notes v2.4',
    description: 'Draft changelog and highlight breaking changes for integrators.',
    dueDate: '2026-04-22',
    priority: 'low',
    status: 'todo',
    assignee: 'Casey Wu',
  },
  {
    id: '5',
    title: 'Onboarding checklist',
    description: 'Ship guided tour for first workspace setup and invite flow.',
    dueDate: '2026-04-15',
    priority: 'medium',
    status: 'in-progress',
    assignee: 'Morgan Patel',
  },
  {
    id: '6',
    title: 'Performance budget',
    description:
      'Measure LCP and bundle size; document thresholds in CI.',
    dueDate: '2026-04-28',
    priority: 'low',
    status: 'done',
    assignee: 'Alex Kim',
  },
]
