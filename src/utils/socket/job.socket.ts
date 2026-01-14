import type { Socket } from "socket.io";
import { Server } from "socket.io";
import IORedis from "ioredis";
import { env } from "../../config/env";

export const registerJobRoomHandlers = (socket: Socket) => {
  socket.on("subscribe-job", (jobId: string) => {
    if (!jobId) return;
    socket.join(jobId);
  });
  socket.on("unsubscribe-job", (jobId: string) => {
    if (!jobId) return;
    socket.leave(jobId);
  });
};

export const setupJobStatusSubscriber = (io: Server) => {
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
  return sub;
};
