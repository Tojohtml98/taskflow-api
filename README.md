# TaskFlow API

> Production-grade REST API for task management — written in **TypeScript**, with JWT auth and refresh token rotation, a strict layered architecture and 61 integration tests.

[![CI](https://github.com/Tojohtml98/taskflow-api/actions/workflows/ci.yml/badge.svg)](https://github.com/Tojohtml98/taskflow-api/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Tests](https://img.shields.io/badge/tests-61%20passing-brightgreen)](#testing)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](#docker)

### 🚀 Live

| | Link |
|---|---|
| **API** | https://taskflow-api-mti1.onrender.com |
| **Frontend** | https://taskflow-client-nu.vercel.app |
| **Repo (frontend)** | [taskflow-client](https://github.com/Tojohtml98/taskflow-client) |

> ⚠️ Render free tier sleeps after 15 min of inactivity — first request may take ~30s.

### Highlights

- 🔷 **TypeScript, strict mode** — typed domain models, typed `req.user` via declaration merging, no implicit `any`
- 🔐 **Stateless auth** — access tokens (15m) + refresh token rotation with logout invalidation
- 🧱 **Strict layered architecture** — Route → Controller → Service → Repository → Model. No layer skips another.
- 🛡️ **Schema validation at the edge** — zod validates and strips every request body before it reaches a controller. Unknown fields never reach the DB.
- 👤 **Guest access** — `POST /api/auth/guest` creates a temporary account seeded with sample projects, so anyone can try the app in one click. Expired guests (24h) are cleaned up with their projects and tasks.
- 🧪 **61 integration tests** — auth flows, guest sessions, CRUD, ownership enforcement, input validation. In-memory Mongo, no external DB needed.
- 🐳 **Dockerized** — `docker-compose up` and you have API + Mongo running locally.
- ☁️ **Deployed** — Blueprint config (`render.yaml`) ready to redeploy in 1 click.

## Tech Stack

- **Language:** TypeScript (strict)
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access token 15m + refresh token 7d)
- **Validation:** zod (schema-per-module, applied as route middleware)
- **Testing:** Jest + ts-jest + Supertest + mongodb-memory-server
- **Containerization:** Docker + Docker Compose

## Architecture

Requests flow through a strict layered pipeline — no layer skips another:

```
Request → Route → Controller → Service → Repository → Model
```

```
src/
├── config/          # DB connection and env vars
├── middleware/       # JWT authenticate, role authorize, body validation, error handler
└── modules/
    ├── auth/         # Register, login, refresh, logout
    ├── projects/     # Project CRUD (model, repository, service, controller, routes)
    └── tasks/        # Task CRUD — nested under projects
```

## Features

- JWT authentication with refresh token rotation
- Token invalidation on logout
- Project CRUD — scoped to the authenticated owner
- Task CRUD — nested under projects with priority, status and due date
- Role-based authorization middleware (`admin` / `user`)
- Global async error handling via `express-async-errors`
- Request body validation with zod on every write endpoint — returns `400` with per-field detail
- Mass-assignment protection: unknown fields (`role`, `owner`, `project`) are stripped, not persisted
- Guest sessions with seeded sample data and automatic cleanup after 24h
- Per-visitor rate limiting behind Render's proxy (`trust proxy`)
- 61 integration tests covering auth, guest sessions, projects, tasks and validation

## API Endpoints

### Meta
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/` | Landing page with API info | ✗ |
| `GET` | `/health` | Health check — returns `{ "status": "ok" }` | ✗ |

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Create account | ✗ |
| `POST` | `/api/auth/login` | Login | ✗ |
| `POST` | `/api/auth/guest` | Temporary guest account with sample data (24h) | ✗ |
| `POST` | `/api/auth/refresh` | Refresh access token | ✗ |
| `POST` | `/api/auth/logout` | Logout and invalidate token | ✓ |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List user's projects |
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects/:id` | Get project |
| `PATCH` | `/api/projects/:id` | Update project |
| `DELETE` | `/api/projects/:id` | Delete project |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects/:projectId/tasks` | List tasks |
| `POST` | `/api/projects/:projectId/tasks` | Create task |
| `GET` | `/api/projects/:projectId/tasks/:taskId` | Get task |
| `PATCH` | `/api/projects/:projectId/tasks/:taskId` | Update task |
| `DELETE` | `/api/projects/:projectId/tasks/:taskId` | Delete task |

All `/api/projects` routes require a `Bearer` token in the `Authorization` header.

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (or use Docker)

### Local setup

```bash
# 1. Clone the repo
git clone https://github.com/Tojohtml98/taskflow-api
cd taskflow-api

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values

# 4. Start MongoDB (optional — uses Docker)
docker-compose up mongo -d

# 5. Start the server (dev, with hot reload via ts-node-dev)
npm run dev
```

The API will be available at `http://localhost:3000`.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run with hot reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build (`dist/server.js`) — used in production |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Run the integration test suite |

## Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=development
# Allowed origin for CORS. Defaults to '*' when unset.
CORS_ORIGIN=https://your-app.vercel.app
```

## Testing

Tests use an in-memory MongoDB instance — no external database required.

```bash
npm test
```

```
Test Suites: 5 passed
Tests:       61 passed
  ✓ auth   — register, login, refresh, logout + body validation
  ✓ guest  — seeded workspace, isolation, 24h cleanup that never touches real users
  ✓ projects — CRUD + ownership enforcement + body validation
  ✓ tasks  — CRUD + project access control + body validation
```

## Docker

```bash
# Run API + MongoDB
docker-compose up --build

# MongoDB only (for local development)
docker-compose up mongo -d
```

## Frontend

The React frontend for this API lives at [taskflow-client](https://github.com/Tojohtml98/taskflow-client).
