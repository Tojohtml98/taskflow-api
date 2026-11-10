// Datos de ejemplo para cuentas de invitado: suficiente para que un visitante
// vea el producto "vivo" (estados, prioridades, vencimientos) sin cargar nada.
type Status = 'todo' | 'in-progress' | 'done'
type Priority = 'low' | 'medium' | 'high'

export interface SeedTask {
  title: string
  description?: string
  status: Status
  priority: Priority
  dueInDays?: number // relativo a hoy: así nunca quedan todas vencidas
}

export interface SeedProject {
  name: string
  description: string
  tasks: SeedTask[]
}

export const GUEST_SEED: SeedProject[] = [
  {
    name: 'Website relaunch',
    description: 'New marketing site: faster, accessible and easier to edit.',
    tasks: [
      { title: 'Audit current site with Lighthouse', status: 'done', priority: 'medium' },
      { title: 'Define page structure and copy', status: 'done', priority: 'high' },
      { title: 'Build responsive layout', description: 'Mobile first, 390px up to desktop.', status: 'in-progress', priority: 'high', dueInDays: 3 },
      { title: 'Add Open Graph previews', status: 'todo', priority: 'medium', dueInDays: 6 },
      { title: 'Set up analytics', status: 'todo', priority: 'low', dueInDays: 10 },
    ],
  },
  {
    name: 'Mobile app v2',
    description: 'Offline mode and push notifications.',
    tasks: [
      { title: 'Design offline sync strategy', status: 'in-progress', priority: 'high', dueInDays: 2 },
      { title: 'Write API contract for notifications', status: 'todo', priority: 'medium', dueInDays: 5 },
      { title: 'Fix login crash on Android 14', description: 'Reported by 3 users this week.', status: 'todo', priority: 'high', dueInDays: 1 },
      { title: 'Update onboarding screens', status: 'done', priority: 'low' },
    ],
  },
  {
    name: 'Team onboarding',
    description: 'Everything a new developer needs in week one.',
    tasks: [
      { title: 'Document local setup with Docker', status: 'done', priority: 'medium' },
      { title: 'Record architecture walkthrough', status: 'todo', priority: 'low', dueInDays: 14 },
    ],
  },
]
