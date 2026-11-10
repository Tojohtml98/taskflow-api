import rateLimit from 'express-rate-limit'

// 10 intentos cada 15 minutos por IP en login/register.
// AppError no aplica aca: express-rate-limit maneja su propia respuesta
// via handler antes de que el request llegue al errorHandler global.
// skip en NODE_ENV=test: si no, los 40+ requests de auth.test.ts (que
// comparten IP en supertest) empiezan a devolver 429 entre si.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many attempts, try again later' } },
})

// Cada invitado crea 1 usuario + 3 proyectos + 11 tareas: límite aparte y más
// estricto para que nadie llene la base a fuerza de clicks.
export const guestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { message: 'Too many guest sessions, try again later' } },
})
