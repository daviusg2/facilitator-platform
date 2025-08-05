import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";

// routes & middleware
import requireAuth from "./middleware/requireAuth";
import meRouter from "./routes/me";
import sessionRouter from "./routes/session";
import questionRouter from "./routes/question";

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI!;

// Global variable to store the Socket.IO instance
let io: Server;

// Export function to get the Socket.IO instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialised");
  }
  return io;
};

async function bootstrap() {
  /* ─── DB ─────────────────────────────────────────────── */
  await mongoose.connect(MONGODB_URI);
  console.log("✅ MongoDB connected");

  /* ─── Express app ────────────────────────────────────── */
  const app = express();
  
  // Fix CORS configuration
  app.use(cors({ 
    origin: ["http://localhost:5173"], // Specific origin instead of "*"
    credentials: true // Allow credentials
  }));
  
  app.use(express.json());

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", db: mongoose.connection.readyState })
  );

  // Add a simple test route
  app.get("/api/test", (_req, res) => {
    console.log("🧪 Test route hit!");
    res.json({ message: "Test route works!", timestamp: new Date().toISOString() });
  });

  // Request logger (optional)
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // JWT-protected API
  // Temporarily bypass auth for testing
  // app.use("/api", requireAuth);
  app.use("/api/me", meRouter);
  app.use("/api/sessions", sessionRouter);
  app.use("/api/questions", questionRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not Found" }));
  app.use(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error("💥 API error:", err);
      res.status(500).json({ error: "Internal" });
    }
  );

  /* ─── HTTP + Socket.IO ───────────────────────────────── */
  const httpServer = http.createServer(app);

  // Initialize Socket.IO and store in global variable
  io = new Server(httpServer, {
    cors: { 
      origin: ["http://localhost:5173"],
      credentials: true // This is the key fix!
    },
  });

  console.log("✅ Socket.IO initialized");

  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);

    socket.on("join-session", (id) => {
      console.log(`📍 Socket ${socket.id} joining session: ${id}`);
      socket.join(id);
    });
    
    socket.on("question-activated", (id, q) => {
      console.log(`📡 Broadcasting question to session ${id}:`, q);
      socket.to(id).emit("question-activated", q);
    });

    socket.on("disconnect", () => {
      console.log("🔌 socket disconnected:", socket.id);
    });
  });

  /* ─── Start server ───────────────────────────────────── */
  httpServer.listen(PORT, () => {
    console.log(`🚀 API + Socket.IO on http://localhost:${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error("❌ Failed to start API:", e);
  process.exit(1);
});
