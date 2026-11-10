import crypto from 'crypto'
import jwt, { SignOptions } from 'jsonwebtoken'
import authRepository from './auth.repository'
import projectRepository from '../projects/project.repository'
import taskRepository from '../tasks/task.repository'
import { GUEST_SEED } from './guest.seed'
import { AppError } from '../../middleware/errorHandler'
import env from '../../config/env'
import { AuthPayload } from '../../types'

interface RegisterInput {
  name: string
  email: string
  password: string
}

interface LoginInput {
  email: string
  password: string
}

const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign({ id: userId, role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions)
  const refreshToken = jwt.sign({ id: userId }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as SignOptions)
  return { accessToken, refreshToken }
}

const register = async ({ name, email, password }: RegisterInput) => {
  const exists = await authRepository.findByEmail(email)
  if (exists) throw new AppError('Email already in use', 400)

  const created = await authRepository.create({ name, email, password })
  const { accessToken, refreshToken } = generateTokens(created._id.toString(), created.role)
  const user = await authRepository.updateRefreshToken(created._id.toString(), refreshToken)

  return { user, accessToken, refreshToken }
}

const login = async ({ email, password }: LoginInput) => {
  const user = await authRepository.findByEmail(email)
  if (!user) throw new AppError('Invalid credentials', 401)

  const valid = await user.comparePassword(password)
  if (!valid) throw new AppError('Invalid credentials', 401)

  const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role)
  const updated = await authRepository.updateRefreshToken(user._id.toString(), refreshToken)

  return { user: updated, accessToken, refreshToken }
}

const refresh = async (token: string) => {
  if (!token) throw new AppError('No refresh token', 401)

  let payload: AuthPayload
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret) as AuthPayload
  } catch {
    throw new AppError('Invalid refresh token', 401)
  }

  const user = await authRepository.findById(payload.id)

  if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401)

  const tokens = generateTokens(user._id.toString(), user.role)
  await authRepository.updateRefreshToken(user._id.toString(), tokens.refreshToken)

  return tokens
}

const logout = async (userId: string) => {
  await authRepository.updateRefreshToken(userId, null)
}

export const GUEST_TTL_MS = 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// Borra invitados de más de 24 h junto con sus proyectos y tareas.
// No uso un índice TTL de Mongo porque borraría solo el usuario: los proyectos
// y tareas quedarían huérfanos. Limpieza "perezosa": corre cuando se crea un
// invitado nuevo, así no depende de un cron (Render free duerme el servicio).
const cleanupExpiredGuests = async (now = new Date()) => {
  const guestIds = await authRepository.findExpiredGuestIds(new Date(now.getTime() - GUEST_TTL_MS))
  if (!guestIds.length) return 0

  const projectIds = await projectRepository.findIdsByOwners(guestIds)
  await taskRepository.removeByProjects(projectIds)
  await projectRepository.removeByOwners(guestIds)
  await authRepository.removeMany(guestIds)
  return guestIds.length
}

const seedGuestData = async (ownerId: string) => {
  const now = Date.now()
  // Al revés: la lista se ordena por createdAt desc, así el primero del seed queda arriba
  for (const seed of [...GUEST_SEED].reverse()) {
    const project = await projectRepository.create({ name: seed.name, description: seed.description, owner: ownerId })
    await taskRepository.insertMany(
      seed.tasks.map(t => ({
        title: t.title,
        description: t.description ?? '',
        status: t.status,
        priority: t.priority,
        dueDate: t.dueInDays === undefined ? null : new Date(now + t.dueInDays * DAY_MS),
        project: project._id,
      }))
    )
  }
}

// Cuenta temporal con datos de ejemplo: el visitante (ej. un recruiter)
// prueba la app con un click, sin registrarse.
const guest = async () => {
  await cleanupExpiredGuests()

  const id = crypto.randomUUID()
  const created = await authRepository.create({
    name: 'Guest',
    email: `guest-${id}@guest.taskflow.local`,
    password: crypto.randomBytes(24).toString('hex'), // nadie la conoce: solo se entra con los tokens
    isGuest: true,
  })
  await seedGuestData(created._id.toString())

  const { accessToken, refreshToken } = generateTokens(created._id.toString(), created.role)
  const user = await authRepository.updateRefreshToken(created._id.toString(), refreshToken)

  return { user, accessToken, refreshToken }
}

export default { register, login, refresh, logout, guest, cleanupExpiredGuests }
