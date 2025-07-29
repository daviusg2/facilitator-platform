import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import requireAuth from "../middleware/requireAuth";
import Session from "../models/session";

const router = Router();

/**
 * GET /api/sessions
 * Lists sessions for the caller's organisation.
 * Optional filters: ?mine=true to only return caller's sessions.
 */
router.get("/", requireAuth, async (req, res) => {
  const orgId = (req as any).user["custom:orgId"];
  const sessions = await Session.find({ orgId }).sort({ createdAt: -1 });
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

router.post("/", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user;
    const orgId = claims["custom:orgId"];
    const facilitatorId = claims.sub; // we store Cognito sub as user id

    const doc = await Session.create({
      orgId,
      facilitatorId, // your model type should be String now
      title: req.body.title,
      moduleType: "discussion",
      status: "draft",
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error("Create session error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;

