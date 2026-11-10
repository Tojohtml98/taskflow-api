import mongoose, { Schema } from 'mongoose'
import type { Store, Options, IncrementResponse } from 'express-rate-limit'

// Contadores de rate limit en Mongo: en serverless (Vercel) hay varias instancias
// vivas a la vez y un contador en memoria se multiplicaría por cada una.
// Con Mongo todas comparten el mismo contador.
interface IRateLimit {
  _id: string
  hits: number
  resetAt: Date
}

const rateLimitSchema = new Schema<IRateLimit>(
  {
    _id: { type: String, required: true },
    hits: { type: Number, required: true },
    // TTL: Mongo borra solo el contador cuando vence la ventana
    resetAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false }
)

export const RateLimit =
  (mongoose.models.RateLimit as mongoose.Model<IRateLimit>) ||
  mongoose.model<IRateLimit>('RateLimit', rateLimitSchema)

const DUPLICATE_KEY = 11000

export class MongoRateLimitStore implements Store {
  private windowMs = 60_000

  // prefix separa limitadores distintos (login vs. invitados) que usan la misma IP como key
  constructor(private readonly keyPrefix: string) {}

  init(options: Options): void {
    this.windowMs = options.windowMs
  }

  async increment(key: string): Promise<IncrementResponse> {
    const _id = `${this.keyPrefix}:${key}`
    const now = new Date()

    // 1) Ventana vigente: suma atómica
    const current = await RateLimit.findOneAndUpdate(
      { _id, resetAt: { $gt: now } },
      { $inc: { hits: 1 } },
      { returnDocument: 'after', lean: true }
    )
    if (current) return { totalHits: current.hits, resetTime: current.resetAt }

    // 2) Sin ventana o vencida: arrancar una nueva. Si otra instancia la creó en el
    //    mismo instante, el upsert choca por _id (E11000) y reintentamos el paso 1.
    try {
      const fresh = await RateLimit.findOneAndUpdate(
        { _id, resetAt: { $lte: now } },
        { $set: { hits: 1, resetAt: new Date(now.getTime() + this.windowMs) } },
        { upsert: true, returnDocument: 'after', lean: true }
      )
      return { totalHits: fresh!.hits, resetTime: fresh!.resetAt }
    } catch (err) {
      if ((err as { code?: number }).code === DUPLICATE_KEY) return this.increment(key)
      throw err
    }
  }

  async decrement(key: string): Promise<void> {
    await RateLimit.updateOne({ _id: `${this.keyPrefix}:${key}`, resetAt: { $gt: new Date() } }, { $inc: { hits: -1 } })
  }

  async resetKey(key: string): Promise<void> {
    await RateLimit.deleteOne({ _id: `${this.keyPrefix}:${key}` })
  }
}
