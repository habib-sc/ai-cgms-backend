# AI CGMS Backend

## Project Overview

- Backend API for AI-powered content generation and management
- Queues content generation tasks, processes them asynchronously, and provides realtime status updates to the frontend
- Supports multiple AI providers (OpenAI, Gemini) and common content types (blog outline, blog post, product description, social caption, email subject lines, ad copy)

## Tech Stack

- Runtime: Node.js & Express.js (TypeScript)
- Database: MongoDB (Mongoose 9)
- Queue: BullMQ + Redis
- Realtime: Socket.IO
- Auth: JWT (Bearer)
- Validation: Zod
- AI SDKs: OpenAI, Gemini (future extensions)

## Setup Instructions

### Prerequisites

- Node.js v22+
- MongoDB (local or hosted)
- Redis (local or hosted)

### Environment Variables

Create a `.env` file in the project root:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/aicgms
JWT_ACCESS_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=redis://127.0.0.1:6379
OPENAI_API_KEY=replace-with-openai-key
DEFAULT_AI_PROVIDER=openai
DEFAULT_OPENAI_MODEL=gpt-5-nano
QUEUE_JOB_DELAY_MS=60000
FRONTEND_ORIGIN=http://localhost:3000
```

### Install Dependencies

```
npm install
```

### Run Backend (API)

```
npm run dev
```

- API base: `http://localhost:5000/api/v1`

### Run Worker (Job Processor)

```
npx ts-node-dev --respawn --transpile-only src/worker.ts
```

### Build & Start (Production)

```
npm run build
npm start
```

### Frontend (Local)

- In your frontend project:
  - Set API base to `http://localhost:5000/api/v1`
  - Use `Authorization: Bearer <accessToken>` for authenticated requests
  - For realtime updates:
    - Connect Socket.IO: `io("http://localhost:5000", { auth: { token: <accessToken> } })`
    - Subscribe to job or content:
      - `socket.emit("subscribe-job", jobId)`
      - `socket.emit("subscribe-content", contentId)`

## API Documentation

### Auth

- POST `/api/v1/auth/register`
  - Body: `{ name, email, password }`
  - Purpose: Register a new user and return tokens
- POST `/api/v1/auth/login`
  - Body: `{ email, password }`
  - Purpose: Login and return tokens
- GET `/api/v1/auth/me`
  - Headers: `Authorization: Bearer <accessToken>`
  - Purpose: Fetch current user profile

### Content

- POST `/api/v1/content/generate`
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ prompt, contentType, model?, provider?, title? }`
  - Purpose: Enqueue content generation; returns `{ jobId, expectedDelay: { minutes, seconds }, contentId }`
- GET `/api/v1/content/:jobId/status`
  - Headers: `Authorization: Bearer <accessToken>`
  - Purpose: Get job status for the user’s content by jobId
- GET `/api/v1/content`
  - Headers: `Authorization: Bearer <accessToken>`
  - Query: `{ page?, limit?, status?, contentType?, startDate?, endDate?, search? }`
  - Purpose: List user’s contents with pagination and filters
- GET `/api/v1/content/:id`
  - Headers: `Authorization: Bearer <accessToken>`
  - Purpose: Get a content document by id
- PATCH `/api/v1/content/:id`
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ title?, tags?, notes? }`
  - Purpose: Update metadata only
- POST `/api/v1/content/:id/regenerate`
  - Headers: `Authorization: Bearer <accessToken>`
  - Body: `{ provider?, model? }`
  - Purpose: Reset status and enqueue a new generation job
- DELETE `/api/v1/content/:id`
  - Headers: `Authorization: Bearer <accessToken>`
  - Purpose: Delete a content document

### Realtime (Socket.IO)

- Connect: `io("http://localhost:5000", { auth: { token: <accessToken> } })`
- Client → Server:
  - `subscribe-job`: `jobId`
  - `unsubscribe-job`: `jobId`
- Server → Client:
  - `job-status`: `{ type: "content-generation", jobId?, contentId?, userId, status: "queued" | "processing" | "completed" | "failed", error? }`

## Architectural Decisions

- Asynchronous Processing with BullMQ
  - Jobs are queued to ensure reliable, decoupled content generation
  - `queued → processing → completed/failed` lifecycle managed by worker events
- Redis Pub/Sub Bridge for Realtime
  - Worker publishes job-status to Redis; API forwards to Socket.IO rooms (jobId, contentId)
  - Decouples worker from web clients and enables horizontal scaling
- Model Provider Choice
  - OpenAI models supported currently; default provider/model configurable via env
  - Enables flexibility in cost/latency/quality trade-offs per content type
- Validation & Safety
  - Zod schemas validate inputs; JWT bearer keeps auth simple and stateless
  - CORS simplified for REST without credentials; explicit CORS for Socket.IO
- Data Model & Statuses
  - Content includes metadata (title, tags, notes) and generated result
  - Status enum: `pending | processing | queued | completed | failed`
  - Worker updates status and persists errors/results for transparency
