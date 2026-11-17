import { Request, Response, NextFunction, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'
import env from '../config/env'
import { AuthPayload } from '../types'

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) throw new AppError('No token provided', 401)

  const token = header.split(' ')[1]
  req.user = verifyAccessToken(token) // { id, role } disponible en todos los controllers
  next()
}

// jwt.verify tira errores sin statusCode: sin traducirlos caen al 500 generico,
// y el cliente solo intenta el refresh ante un 401.
const verifyAccessToken = (token: string): AuthPayload => {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AppError('Token expired', 401)
    if (err instanceof jwt.JsonWebTokenError) throw new AppError('Invalid token', 401)
    throw err
  }
}

export const authorize =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user.role || !roles.includes(req.user.role)) throw new AppError('Forbidden', 403)
    next()
  }
