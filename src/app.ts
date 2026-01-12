import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// global error handler (always last)
app.use(errorHandler);

export default app;
