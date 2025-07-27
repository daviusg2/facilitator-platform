import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { requireAuth } from "./middleware/requireAuth"; // named export
import { errorHandler } from "./middleware/errorHandler";

import meRouter from "./routes/me";
import sessionRouter from "./routes/session";           // default export
import questionRouter from "./routes/question";         // default export
import { responseRouter } from "./routes/response";         // default export
import { initIO } from "./socket";

const PORT = Number(process.env.PORT || 4000);
const MONGODB_URI = process.env.MONGODB_URI!;

async function bootstrap() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health first — include DB state so we can observe readiness
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      dbState: mongoose.connection.readyState, // 0=disconnected 1=connected 2=connecting 3=disconnecting
    });
  });

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
  const server = http.createServer(app);
  initIO(server);

  server.listen(PORT, () => {
    console.log(`🚀 API + sockets on http://localhost:${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("❌ Failed to start API:", e);
  process.exit(1);
});