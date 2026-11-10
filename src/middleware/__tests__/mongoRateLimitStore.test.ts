import express from 'express'
import request from 'supertest'
import rateLimit from 'express-rate-limit'
import { MongoRateLimitStore, RateLimit } from '../mongoRateLimitStore'

const makeStore = (prefix = 'test', windowMs = 60_000) => {
  const store = new MongoRateLimitStore(prefix)
  store.init({ windowMs } as Parameters<MongoRateLimitStore['init']>[0])
  return store
}

describe('MongoRateLimitStore', () => {
  it('counts hits inside the window', async () => {
    const store = makeStore()
    await store.increment('1.1.1.1')
    await store.increment('1.1.1.1')
    const { totalHits, resetTime } = await store.increment('1.1.1.1')
    expect(totalHits).toBe(3)
    expect(resetTime!.getTime()).toBeGreaterThan(Date.now())
  })

  it('is atomic under concurrent requests', async () => {
    const store = makeStore()
    await Promise.all(Array.from({ length: 25 }, () => store.increment('2.2.2.2')))
    const doc = await RateLimit.findById('test:2.2.2.2').lean()
    expect(doc!.hits).toBe(25)
  })

  it('starts a new window once the previous one expired', async () => {
    const store = makeStore('test', 50)
    await store.increment('3.3.3.3')
    await store.increment('3.3.3.3')
    await new Promise(r => setTimeout(r, 80))
    const { totalHits } = await store.increment('3.3.3.3')
    expect(totalHits).toBe(1)
  })

  it('keeps different limiters (prefixes) apart', async () => {
    await makeStore('auth').increment('4.4.4.4')
    const { totalHits } = await makeStore('guest').increment('4.4.4.4')
    expect(totalHits).toBe(1)
  })

  it('supports decrement and resetKey', async () => {
    const store = makeStore()
    await store.increment('5.5.5.5')
    await store.increment('5.5.5.5')
    await store.decrement('5.5.5.5')
    expect((await RateLimit.findById('test:5.5.5.5').lean())!.hits).toBe(1)
    await store.resetKey('5.5.5.5')
    expect(await RateLimit.findById('test:5.5.5.5')).toBeNull()
  })

  it('shares the limit across separate instances (serverless)', async () => {
    // Dos "instancias" = dos apps con su propio limiter, mismo store en Mongo
    const instance = () => {
      const app = express()
      app.use(rateLimit({ windowMs: 60_000, limit: 3, store: new MongoRateLimitStore('shared') }))
      app.get('/', (_req, res) => res.send('ok'))
      return app
    }
    const a = instance()
    const b = instance()

    expect((await request(a).get('/')).status).toBe(200)
    expect((await request(b).get('/')).status).toBe(200)
    expect((await request(a).get('/')).status).toBe(200)
    // el 4.º pedido entre ambas instancias ya supera el límite
    expect((await request(b).get('/')).status).toBe(429)
  })
})
