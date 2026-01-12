import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware";
import router from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

// app route entry
app.use("/api/v1", router);

// Middleware to parse JSON bodies
app.use(express.json());

// global error handler (always last)
app.use(errorHandler);

export default app;
