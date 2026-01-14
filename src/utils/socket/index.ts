import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { env } from "../../config/env";
import { authenticateSocket } from "./auth.socket";
import {
  registerJobRoomHandlers,
  setupJobStatusSubscriber,
} from "./job.socket";

let ioInstance: Server | null = null;

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", registerJobRoomHandlers);

  setupJobStatusSubscriber(io);

  ioInstance = io;
  return io;
}

export function getIO(): Server {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
}
