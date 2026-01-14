import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import IORedis from "ioredis";
import { env } from "../config/env";

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").split(" ")[1];
      if (token)
        (socket as any).user = jwt.verify(token, env.JWT_ACCESS_SECRET);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("subscribe-job", (jobId: string) => {
      if (!jobId) return;
      socket.join(jobId);
    });
    socket.on("unsubscribe-job", (jobId: string) => {
      if (!jobId) return;
      socket.leave(jobId);
    });
  });

  const sub = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  sub.subscribe("job-status", () => {});
  sub.on("message", (_channel, message) => {
    try {
      const payload = JSON.parse(message);
      const jobId = payload?.jobId as string;
      if (!jobId) return;
      io.to(jobId).emit("job-status", payload);
    } catch {}
  });

  return io;
}
