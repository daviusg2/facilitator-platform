import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { createServer } from "http";
import { initIO } from "./socket";
import { requireAuth } from "./middleware/requireAuth"; // named export
import { errorHandler } from "./middleware/errorHandler";

import meRouter from "./routes/me";
import sessionRouter from "./routes/session";           // default export
import questionRouter from "./routes/question";         // default export
import { responseRouter } from "./routes/response";         // default export

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI!;

async function bootstrap() {
  const app = express();
  app.use(cors({ origin: "*"}));
  app.use(express.json());

  // Health first — include DB state so we can observe readiness
 app.get("/health", (_req, res) =>
  res.json({ status: "ok", db: mongoose.connection.readyState })
);

  // 1) Connect DB BEFORE attaching middleware that hits DB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", (err as any).message);
    process.exit(1);
  }

  // 2) Now it is safe to use requireAuth (it does User.findOne)
  app.use(requireAuth);

  // 3) Routers
  app.use("/api/me", meRouter);
  app.use("/api/sessions", sessionRouter);
  app.use("/api/questions", questionRouter);
  app.use("/api/responses", responseRouter);

  // 4) Error handler last
  app.use(errorHandler);

  // 5) HTTP + sockets
  const httpServer = createServer(app);
initIO(httpServer);

const PORT = process.env.PORT ?? 4000;

async function bootstrap() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ MongoDB connected");
  httpServer.listen(PORT, () => {
    console.log(`🚀 API + sockets on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start API:", err);
})}