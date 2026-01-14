import http from "http";
import { Request, Response } from "express";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import app from "./app";
import { initSocket } from "./utils/socket";

const PORT = env.PORT || 5000;

// Root Api Route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "AI CGMS Backend API is running!" });
});

const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
});

connectDB();
