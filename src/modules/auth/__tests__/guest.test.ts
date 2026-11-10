import request from 'supertest'
import app from '../../../app'
import User from '../user.model'
import Project from '../../projects/project.model'
import Task from '../../tasks/task.model'
import authService, { GUEST_TTL_MS } from '../auth.service'
import { GUEST_SEED } from '../guest.seed'
import { registerUser, createProject, createTask } from '../../../tests/helpers'

const GUEST = '/api/auth/guest'
const SEED_TASKS = GUEST_SEED.reduce((n, p) => n + p.tasks.length, 0)

const backdate = (userId: string, ms: number) =>
  // collection.updateOne saltea los timestamps automáticos de Mongoose
  User.collection.updateOne(
    { _id: new User.base.Types.ObjectId(userId) },
    { $set: { createdAt: new Date(Date.now() - ms) } }
  )

describe('POST /api/auth/guest', () => {
  it('creates a temporary guest account and returns tokens', async () => {
    const res = await request(app).post(GUEST)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('accessToken')
    expect(res.body).toHaveProperty('refreshToken')
    expect(res.body.user.isGuest).toBe(true)
    expect(res.body.user).not.toHaveProperty('password')
    expect(res.body.user).not.toHaveProperty('refreshToken')
  })

  it('seeds sample projects and tasks the guest can read', async () => {
    const { accessToken } = (await request(app).post(GUEST)).body

    const projects = await request(app).get('/api/projects').set('Authorization', `Bearer ${accessToken}`)
    expect(projects.status).toBe(200)
    expect(projects.body).toHaveLength(GUEST_SEED.length)

    const names = projects.body.map((p: { name: string }) => p.name).sort()
    expect(names).toEqual(GUEST_SEED.map(p => p.name).sort())
    expect(await Task.countDocuments()).toBe(SEED_TASKS)
  })

  it('gives every visitor an isolated account', async () => {
    const a = (await request(app).post(GUEST)).body
    const b = (await request(app).post(GUEST)).body

    expect(a.user._id).not.toBe(b.user._id)
    const projectsA = await request(app).get('/api/projects').set('Authorization', `Bearer ${a.accessToken}`)
    expect(projectsA.body).toHaveLength(GUEST_SEED.length) // no ve los proyectos de B
  })

  it('lets the guest use the app normally (create a task)', async () => {
    const { accessToken } = (await request(app).post(GUEST)).body
    const [project] = (await request(app).get('/api/projects').set('Authorization', `Bearer ${accessToken}`)).body

    const res = await request(app)
      .post(`/api/projects/${project._id}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Try Taskflow' })
    expect(res.status).toBe(201)
  })

  it('refresh tokens work for guests', async () => {
    const { refreshToken } = (await request(app).post(GUEST)).body
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('accessToken')
  })
})

describe('cleanupExpiredGuests', () => {
  it('deletes guests older than 24h with their projects and tasks', async () => {
    const old = (await request(app).post(GUEST)).body
    await backdate(old.user._id, GUEST_TTL_MS + 60_000)

    const removed = await authService.cleanupExpiredGuests()

    expect(removed).toBe(1)
    expect(await User.findById(old.user._id)).toBeNull()
    expect(await Project.countDocuments({ owner: old.user._id })).toBe(0)
    expect(await Task.countDocuments()).toBe(0)
  })

  it('keeps fresh guests and never touches regular users', async () => {
    const fresh = (await request(app).post(GUEST)).body
    const regular = await registerUser()
    const project = await createProject(regular.accessToken)
    await createTask(regular.accessToken, project._id)
    await backdate(regular.user._id, GUEST_TTL_MS * 30) // usuario real viejo

    const removed = await authService.cleanupExpiredGuests()

    expect(removed).toBe(0)
    expect(await User.findById(fresh.user._id)).not.toBeNull()
    expect(await User.findById(regular.user._id)).not.toBeNull()
    expect(await Task.countDocuments({ project: project._id })).toBe(1)
  })

  it('runs automatically when a new guest is created', async () => {
    const old = (await request(app).post(GUEST)).body
    await backdate(old.user._id, GUEST_TTL_MS + 60_000)

    await request(app).post(GUEST)

    expect(await User.findById(old.user._id)).toBeNull()
    expect(await User.countDocuments({ isGuest: true })).toBe(1)
  })
})

describe('proxy config', () => {
  it('trusts the first proxy so rate limits are per visitor, not global', () => {
    expect(app.get('trust proxy')).toBe(1)
  })
})
