import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || "").split(" ")[1];
    if (token) (socket as any).user = jwt.verify(token, env.JWT_ACCESS_SECRET);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
};
