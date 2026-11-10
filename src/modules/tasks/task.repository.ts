import { Types } from 'mongoose'
import Task from './task.model'

export interface TaskInput {
  title?: string
  description?: string
  status?: 'todo' | 'in-progress' | 'done'
  priority?: 'low' | 'medium' | 'high'
  dueDate?: Date | null
  project?: Types.ObjectId | string
  assignedTo?: Types.ObjectId | string | null
}

const create = (data: TaskInput) => Task.create(data)
const findById = (id: string) => Task.findById(id)
const findByProject = (projectId: string) => Task.find({ project: projectId }).sort({ createdAt: -1 })
const update = (id: string, data: TaskInput) =>
  Task.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true })
const remove = (id: string) => Task.findByIdAndDelete(id)
const insertMany = (data: TaskInput[]) => Task.insertMany(data)
const removeByProjects = (projectIds: Types.ObjectId[]) => Task.deleteMany({ project: { $in: projectIds } })

export default { create, findById, findByProject, update, remove, insertMany, removeByProjects }
