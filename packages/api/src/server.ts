// packages/api/src/server.ts
//----------------------------------------------------------------
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";

import { requireAuth } from "./middleware/requireAuth";
import { initIO } from "./socket";
import { orgRouter } from "./routes/organisation";
import { router } from "./routes/session";
import { questionRouter } from "./routes/question";
import { responseRouter } from "./routes/response";
import { questionActionsRouter } from "./routes/questionActions";

dotenv.config();
const PORT        = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "";

//----------------------------------------------------------------
async function bootstrap() {
  // 1️⃣  DB first
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected");

  // 2️⃣  Express app
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 3️⃣  Routers (order doesn’t matter here)
  app.use(requireAuth);
  app.use("/api/orgs", orgRouter);
  app.use("/api/sessions", router);
  app.use("/api/sessions/:sessionId/questions", questionRouter);
  app.use("/api/questions", questionActionsRouter);
  app.use("/api/questions", responseRouter);
  // 4️⃣  Health-check (optional for curl sanity)
  app.get("/health", (_, res) =>
    res.json({ status: "ok", db: mongoose.connection.readyState })
  );

  // 5️⃣  ----  Socket.IO  ----                     (‼️ order matters)
  // * create ONE HTTP server that wraps Express
  const httpServer = http.createServer(app);
  // * attach Socket.IO exactly once
  initIO(httpServer);

  // 6️⃣  Listen
  httpServer.listen(PORT, () =>
    console.log(`🚀 API + sockets on http://localhost:${PORT}`)
  );
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start API:", err);
  process.exit(1);
});

console.log("AUTH DEBUG ENV", {
  audience: process.env.COGNITO_AUDIENCE,
  pool: process.env.COGNITO_USER_POOL_ID,
  region: process.env.COGNITO_REGION
});

