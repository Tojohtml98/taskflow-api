import { Request, Response } from 'express'
import authService from './auth.service'

export const registerController = async (req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.register(req.body)
  res.status(201).json({ user, accessToken, refreshToken })
}

export const loginController = async (req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.login(req.body)
  res.json({ user, accessToken, refreshToken })
}

export const guestController = async (_req: Request, res: Response): Promise<void> => {
  const { user, accessToken, refreshToken } = await authService.guest()
  res.status(201).json({ user, accessToken, refreshToken })
}

export const refreshController = async (req: Request, res: Response): Promise<void> => {
  const tokens = await authService.refresh(req.body.refreshToken)
  res.json(tokens)
}

export const logoutController = async (req: Request, res: Response): Promise<void> => {
  await authService.logout(req.user.id)
  res.json({ message: 'Logged out' })
}
