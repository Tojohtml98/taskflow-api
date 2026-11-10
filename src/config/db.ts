import mongoose from 'mongoose'
import env from './env'
import logger from './logger'

// En serverless (Vercel) cada invocación puede reusar la instancia anterior:
// guardamos la promesa de conexión para no abrir una conexión nueva por request.
let connecting: Promise<typeof mongoose> | null = null

const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return

  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 }).catch((err) => {
      connecting = null // permite reintentar en la próxima invocación
      throw err
    })
  }

  const conn = await connecting
  logger.info(`MongoDB connected: ${conn.connection.host}`)
}

export default connectDB
