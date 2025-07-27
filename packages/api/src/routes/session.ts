import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Session from "../models/session";

const router = Router();

/**
 * GET /api/sessions
 * Lists sessions for the caller's organisation.
 * Optional filters: ?mine=true to only return caller's sessions.
 */
router.get("/", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: "Unauthenticated" });

  const { orgId, userId } = req.auth;
  if (!orgId) return res.status(400).json({ error: "Missing orgId in token" });

  const mine = req.query.mine === "true";

  const filter: any = { orgId: new Types.ObjectId(orgId) };
  if (mine && userId) filter.facilitatorId = new Types.ObjectId(userId);

  console.log("DEBUG Session typeof:", typeof Session);

  const sessions = await Session.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  res.json(sessions);
});

/**
 * POST /api/sessions
 * Creates a session; orgId & facilitatorId are derived from token.
 */
const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  moduleType: z.enum(["discussion"]).default("discussion"), // future-proof
});

router.post("/", async (req, res) => {
  if (!req.auth) return res.status(401).json({ error: "Unauthenticated" });

  const { orgId, userId } = req.auth;
  if (!orgId || !userId) {
    return res.status(400).json({ error: "Missing orgId/userId in token" });
  }

  let data;
  try {
    data = CreateSessionSchema.parse(req.body);
  } catch (e: any) {
    return res.status(400).json({ error: e.errors ?? "Invalid payload" });
  }

  try {
    const doc = await Session.create({
      title: data.title,
      moduleType: data.moduleType,
      orgId: new Types.ObjectId(orgId),
      facilitatorId: new Types.ObjectId(userId),
      status: "draft",
    });

    res.status(201).json(doc.toObject());
  } catch (e: any) {
    console.error("Create session error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;

