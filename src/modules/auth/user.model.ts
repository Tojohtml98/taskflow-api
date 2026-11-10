import mongoose, { Model, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser {
  name: string
  email: string
  password: string
  role: 'user' | 'admin'
  refreshToken: string | null
  isGuest: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    refreshToken: { type: String, default: null },
    isGuest: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// La limpieza de invitados vencidos busca por estos dos campos
userSchema.index({ isGuest: 1, createdAt: 1 })

// Antes de guardar, encripta la password si fue modificada
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

// Método para comparar password en login
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

// No devolver password ni refreshToken en las respuestas
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshToken
  return obj
}

export default mongoose.model<IUser, UserModel>('User', userSchema)
