import 'express-async-errors'
import express, { Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import pinoHttp from 'pino-http'
import logger from './config/logger'
import { errorHandler } from './middleware/errorHandler'
import { authenticate } from './middleware/authenticate'
import authRoutes from './modules/auth/auth.routes'
import projectRoutes from './modules/projects/project.routes'

const app = express()

// Render pone un proxy adelante: sin esto req.ip es la IP del proxy y el
// rate limit se comparte entre TODOS los visitantes.
app.set('trust proxy', 1)

app.use(pinoHttp({ logger }))

app.get('/', (_req: Request, res: Response) =>
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Taskflow API</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root { color-scheme: dark; }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #0a0a0a; color: #e5e5e5;
      max-width: 640px; margin: 0 auto; padding: 4rem 1.5rem;
      line-height: 1.6;
    }
    h1 { font-size: 2rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
    .meta { color: #888; margin-bottom: 2rem; }
    .status { color: #10b981; }
    .status::before { content: "● "; }
    h2 { font-size: .85rem; text-transform: uppercase; letter-spacing: .1em; color: #888; margin: 2rem 0 .75rem; font-weight: 500; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: .4rem 0; border-bottom: 1px solid #1f1f1f; display: flex; gap: 1rem; }
    li:last-child { border: none; }
    .method { color: #60a5fa; min-width: 4rem; font-weight: 600; }
    .path { color: #e5e5e5; }
    .note { color: #666; font-size: .85rem; margin-left: auto; }
    a { color: #60a5fa; text-decoration: none; border-bottom: 1px solid #1e3a5f; }
    a:hover { border-color: #60a5fa; }
  </style>
</head>
<body>
  <h1>Taskflow API</h1>
  <div class="meta"><span class="status">live</span> · v1.0.0</div>

  <h2>Links</h2>
  <ul>
    <li><span class="method">FRONT</span><a class="path" href="https://taskflow-client-nu.vercel.app">taskflow-client-nu.vercel.app</a></li>
    <li><span class="method">REPO</span><a class="path" href="https://github.com/Tojohtml98/taskflow-api">github.com/Tojohtml98/taskflow-api</a></li>
  </ul>

  <h2>Endpoints</h2>
  <ul>
    <li><span class="method">GET</span><span class="path">/health</span></li>
    <li><span class="method">POST</span><span class="path">/api/auth/register</span></li>
    <li><span class="method">POST</span><span class="path">/api/auth/login</span></li>
    <li><span class="method">POST</span><span class="path">/api/auth/guest</span><span class="note">temporary account with sample data</span></li>
    <li><span class="method">POST</span><span class="path">/api/auth/refresh</span></li>
    <li><span class="method">POST</span><span class="path">/api/auth/logout</span></li>
    <li><span class="method">CRUD</span><span class="path">/api/projects</span><span class="note">Bearer token</span></li>
  </ul>
</body>
</html>`)
)

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use(helmet())
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
)
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/projects', authenticate, projectRoutes)

app.use(errorHandler)

export default app
