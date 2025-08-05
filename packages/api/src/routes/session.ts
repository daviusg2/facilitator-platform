import { Router } from "express";
import { z } from "zod";
import { Schema, model, models, Types } from "mongoose";
import requireAuth from "../middleware/requireAuth";
import Session from "../models/session";
import DiscussionQuestion from "../models/discussionQuestion";

const router = Router();

const SessionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organisation", required: true },
    facilitatorId: { type: String, required: true },
    title: { type: String, required: true },
    moduleType: { type: String, default: "discussion" },
    status: { type: String, default: "draft" },
    startAt: { type: Date },
    endAt: { type: Date },
  },
  { timestamps: true }
);

const SessionModel = models.Session || model("Session", SessionSchema);

/**
 * GET /api/sessions
 * Lists sessions for the caller's organisation.
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const orgId = (req as any).user["custom:orgId"];
    const sessions = await SessionModel.find({ orgId }).sort({ createdAt: -1 });
    console.log(`Found ${sessions.length} sessions for org ${orgId}`);
    res.json(sessions);
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * POST /api/sessions
 * Creates a session; orgId & facilitatorId are derived from token.
 */
const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  moduleType: z.enum(["discussion"]).default("discussion"),
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const claims = (req as any).user;
    const orgId = claims["custom:orgId"];
    const facilitatorId = claims.sub;

    const doc = await SessionModel.create({
      orgId,
      facilitatorId,
      title: req.body.title,
      moduleType: "discussion",
      status: "draft",
    });
    
    console.log("Created session:", doc);
    res.status(201).json(doc);
  } catch (e) {
    console.error("Create session error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * PATCH /api/sessions/:id/status
 * Update session status
 */
router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!["draft", "live", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const claims = (req as any).user;
    const orgId = claims["custom:orgId"];
    
    const session = await SessionModel.findOneAndUpdate(
      { _id: id, orgId },
      { status },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    console.log("Updated session status:", session);
    res.json(session);
  } catch (error) {
    console.error("Update session status error:", error);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * GET /api/sessions/:id/questions
 * List all questions for a session
 */
// Temporarily remove requireAuth for testing
router.get("/:id/questions", async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    console.log("🔍 GET questions for session:", sessionId);
    
    const questions = await DiscussionQuestion.find({ sessionId })
      .sort({ order: 1 })
      .lean();
    
    console.log(`✅ Found ${questions.length} questions for session ${sessionId}`);
    res.json(questions);
  } catch (error) {
    console.error("❌ List questions error:", error);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * POST /api/sessions/:id/questions
 * Create a new question for a session
 */
// Temporarily remove requireAuth for testing
router.post("/:id/questions", async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { promptText, order } = req.body;
    
    console.log("🔍 Creating question for session:", sessionId, "with data:", { promptText, order });
    
    const question = await DiscussionQuestion.create({
      sessionId,
      promptText,
      order: order || 1,
      isActive: false
    });

    console.log("✅ Created question:", question);
    res.status(201).json(question);
  } catch (error) {
    console.error("❌ Create question error:", error);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * GET /api/sessions/:id/active-question
 * Get the currently active question for a session (no auth required for participants)
 */
router.get("/:id/active-question", async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    console.log("🔍 Getting active question for session:", sessionId);
    
    const activeQuestion = await DiscussionQuestion.findOne({ 
      sessionId, 
      isActive: true 
    }).lean();
    
    console.log("✅ Active question:", activeQuestion);
    res.json(activeQuestion || null);
  } catch (error) {
    console.error("❌ Get active question error:", error);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;

