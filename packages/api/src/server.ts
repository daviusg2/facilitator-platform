import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { initIO } from "./socket";

import requireAuth from "./middleware/requireAuth";
import meRouter from "./routes/me";
import sessionRouter from "./routes/session";
import questionRouter from "./routes/question";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const MONGODB_URI = process.env.MONGODB_URI!;

async function bootstrap() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected");

  const app = express();
  app.use(cors({ origin: "*"}));
  app.use(express.json());

  app.get("/health", (_req, res) =>
    res.json({
      status: "ok",
      db: mongoose.connection.readyState,
      env: {
        REGION: process.env.REGION,
        USER_POOL_ID: process.env.USER_POOL_ID,
        COGNITO_AUDIENCE: process.env.COGNITO_AUDIENCE,
      },
    })
  );

  // Debug: verify imported types
  console.log("DEBUG typeof requireAuth:", typeof requireAuth);
  console.log("DEBUG typeof meRouter:", typeof meRouter);
  console.log("DEBUG typeof sessionRouter:", typeof sessionRouter);
  console.log("DEBUG typeof questionRouter:", typeof questionRouter);

  // Protect everything under /api with JWT
  app.use("/api", requireAuth);

  // Routes
  app.use("/api/me", meRouter);
  app.use("/api/sessions", sessionRouter);
  app.use("/api/questions", questionRouter);

  // 404
  app.use((_req, res) => res.status(404).json({ error: "Not Found" }));

  // Error handler
  app.use(
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("💥 API error:", err);
      res.status(500).json({ error: "Internal" });
    }
  );

  const httpServer = http.createServer(app);
  initIO(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 API + sockets on http://localhost:${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("❌ Failed to start API:", e);
  process.exit(1);
});
