import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import * as RequireAuthMod from "../middleware/requireAuth";
const requireAuth =
  (RequireAuthMod as any).default ?? (RequireAuthMod as any);
import Session from "../models/session";

const router = Router();

/**
 * GET /api/sessions
 * Lists sessions for the caller's organisation.
 * Optional filters: ?mine=true to only return caller's sessions.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const orgId = (req as any).auth?.orgId || req.query.orgId;
    if (!orgId) return res.status(400).json({ error: "orgId required" });

    const list = await Session.find({ orgId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * POST /api/sessions
 * Creates a session; orgId & facilitatorId are derived from token.
 */
const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  moduleType: z.enum(["discussion"]).default("discussion"), // future-proof
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const auth = (req as any).auth!;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });

    const doc = await Session.create({
      orgId: auth.orgId,
      facilitatorId: auth.userId,   // now a Mongo _id string
      title,
      moduleType: "discussion",
      status: "draft",
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ error: "Internal" });
  }
})

export default router;

