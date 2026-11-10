import type { IncomingMessage, ServerResponse } from 'http'
import app from '../src/app'
import connectDB from '../src/config/db'
import logger from '../src/config/logger'

// Entrada para Vercel: la misma app de Express, corriendo como función serverless.
// Conecta a Mongo (reusando la conexión si la instancia sigue viva) y delega.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const path = (req.url ?? '/').split('?')[0]
  const needsDb = path !== '/' && path !== '/health'

  if (needsDb) {
    try {
      await connectDB()
    } catch (err) {
      logger.error({ err }, 'MongoDB connection failed')
      res.statusCode = 503
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: { message: 'Database unavailable, try again in a moment' } }))
      return
    }
  }

  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1])
}
