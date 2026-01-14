# AI CGMS Backend API

Base

- URL: http://localhost:5000
- Prefix: /api/v1

Auth

- Use Authorization: Bearer <accessToken> on secured endpoints

Auth Endpoints

- POST /api/v1/auth/register

  - Body: { name: string, email: string, password: string }
  - Response: { success: true, message: string, data: { user, accessToken, refreshToken } }

- POST /api/v1/auth/login

  - Body: { email: string, password: string }
  - Response: { success: true, message: string, data: { user, accessToken, refreshToken } }

- GET /api/v1/auth/me
  - Headers: Authorization: Bearer <accessToken>
  - Response: { success: true, message: string, data: Partial<User> }

Content Endpoints

- POST /api/v1/content/generate

  - Headers: Authorization: Bearer <accessToken>
  - Body: {
    prompt: string (1–1000),
    contentType: "blog-post-outline" | "blog-post" | "product-description" | "social-media-caption" | "email-subject-line" | "ad-copy",
    model?: string,
    provider?: "openai",
    title?: string
    }
  - Response: {
    success: true,
    message: string,
    data: {
    jobId: string,
    expectedDelayMs: number,
    contentId: string
    }
    }

- GET /api/v1/content/:jobId/status

  - Headers: Authorization: Bearer <accessToken>
  - Response: { success: true, message: string, data: Content (without prompt/generatedContent) }

- GET /api/v1/content

  - Headers: Authorization: Bearer <accessToken>
  - Query: {
    page?: string,
    limit?: string,
    status?: "pending" | "processing" | "queued" | "completed" | "failed",
    contentType?: (see above),
    startDate?: string,
    endDate?: string,
    search?: string
    }
  - Response: {
    success: true,
    message: string,
    meta: { page: number, limit: number, total: number, pages: number },
    data: Content[]
    }

- GET /api/v1/content/:id

  - Headers: Authorization: Bearer <accessToken>
  - Response: { success: true, message: string, data: Content }

- PATCH /api/v1/content/:id

  - Headers: Authorization: Bearer <accessToken>
  - Body: { title?: string, tags?: string[], notes?: string }
  - Response: { success: true, message: string, data: Content }

- POST /api/v1/content/:id/regenerate

  - Headers: Authorization: Bearer <accessToken>
  - Body: { provider?: "gemini" | "openai", model?: string }
  - Response: { success: true, message: string, data: { jobId: string, contentId: string } }

- DELETE /api/v1/content/:id
  - Headers: Authorization: Bearer <accessToken>
  - Response: { success: true, message: string }

Realtime (Socket.IO)

- Connect: io("http://localhost:5000", { auth: { token: <accessToken> } })
- Client → Server events:
  - subscribe-job: string (jobId)
  - unsubscribe-job: string (jobId)
- Server → Client events:
  - job-status: {
    type: "content-generation",
    jobId?: string,
    contentId?: string,
    userId: string,
    status: "queued" | "processing" | "completed" | "failed",
    error?: string
    }
- Rooms: jobId and contentId are room names used for targeted updates

Examples

- Socket subscription
  - Client
    socket.emit("subscribe-job", jobId);
    socket.on("job-status", (p) => { /_ p.status: queued|processing|completed|failed _/ });
