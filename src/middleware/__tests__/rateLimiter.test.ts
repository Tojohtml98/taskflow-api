import express from 'express'
import request from 'supertest'
import { authRateLimiter } from '../rateLimiter'

// authRateLimiter se auto-desactiva en NODE_ENV=test (ver rateLimiter.ts).
// Acá lo forzamos a "production" para probar el bloqueo real.
describe('authRateLimiter', () => {
  const originalEnv = process.env.NODE_ENV
  const app = express()
  app.post('/limited', authRateLimiter, (_req, res) => res.json({ ok: true }))

  beforeAll(() => {
    process.env.NODE_ENV = 'production'
  })

  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('allows requests under the limit', async () => {
    const res = await request(app).post('/limited')
    expect(res.status).toBe(200)
  })

  it('blocks with 429 after exceeding the limit', async () => {
    // Los contadores viven en Mongo y setup.ts limpia la base entre tests:
    // este test no depende del anterior. 10 permitidos, el 11.º se bloquea.
    for (let i = 0; i < 10; i++) {
      await request(app).post('/limited')
    }

    const res = await request(app).post('/limited')
    expect(res.status).toBe(429)
    expect(res.body.error.message).toMatch(/too many/i)
  })
})
