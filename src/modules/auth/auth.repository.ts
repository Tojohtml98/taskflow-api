import { Types } from 'mongoose'
import User from './user.model'

export interface UserInput {
  name: string
  email: string
  password: string
  isGuest?: boolean
}

const create = (data: UserInput) => User.create(data)
const findByEmail = (email: string) => User.findOne({ email })
const findById = (id: string) => User.findById(id)
const findExpiredGuestIds = async (createdBefore: Date) =>
  (await User.find({ isGuest: true, createdAt: { $lt: createdBefore } }).select('_id')).map(u => u._id)
const removeMany = (ids: Types.ObjectId[]) => User.deleteMany({ _id: { $in: ids } })
const updateRefreshToken = (id: string, refreshToken: string | null) =>
  User.findByIdAndUpdate(id, { refreshToken }, { returnDocument: 'after', runValidators: true })

export default { create, findByEmail, findById, findExpiredGuestIds, removeMany, updateRefreshToken }
