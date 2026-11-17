import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../../app'
import env from '../../config/env'
import { registerUser } from '../../tests/helpers'

// El cliente solo pide un token nuevo (POST /auth/refresh) cuando recibe un 401.
// Si un token vencido o roto devuelve 500, el refresh nunca se dispara y la
// sesion se rompe a los 15 minutos.
const PROTECTED = '/api/projects'

describe('authenticate middleware', () => {
  it('returns 401 for an expired access token', async () => {
    const { user } = await registerUser()
    const expired = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: -10 })

    const res = await request(app).get(PROTECTED).set('Authorization', `Bearer ${expired}`)

    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Token expired')
  })

  it('returns 401 for a token signed with another secret', async () => {
    const forged = jwt.sign({ id: 'someone', role: 'admin' }, 'not-the-real-secret')

    const res = await request(app).get(PROTECTED).set('Authorization', `Bearer ${forged}`)

    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Invalid token')
  })

  it('returns 401 for a malformed token', async () => {
    const res = await request(app).get(PROTECTED).set('Authorization', 'Bearer not-a-jwt')

    expect(res.status).toBe(401)
    expect(res.body.error.message).toBe('Invalid token')
  })
})
