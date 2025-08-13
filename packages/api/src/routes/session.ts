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
/**
 * POST /api/sessions/:id/questions
 * body: { order: number, promptText: string, timerDurationMinutes?: number, notes?: string }
 * Add a new question to a session with timer support
 */
router.post("/:id/questions", async (req, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    
    console.log(`🔍 QUESTION CREATION - Raw request body:`, req.body);
    
    const { order, promptText, timerDurationMinutes, notes } = req.body;

    console.log(`🔍 QUESTION CREATION - Extracted fields:`, {
      order,
      promptText,
      timerDurationMinutes,
      notes,
      timerType: typeof timerDurationMinutes
    });

    // Validate input
    if (!promptText || typeof promptText !== 'string') {
      return res.status(400).json({ error: "promptText is required" });
    }

    if (!order || typeof order !== 'number') {
      return res.status(400).json({ error: "order is required and must be a number" });
    }

    // Create question data
    const questionData: any = {
      sessionId,
      order,
      promptText: promptText.trim(),
      isActive: false,
      timerExtendedMinutes: 0
    };

    // Add timer if provided
    if (timerDurationMinutes !== undefined && timerDurationMinutes !== null && timerDurationMinutes > 0) {
      console.log(`⏰ ADDING TIMER to question data: ${timerDurationMinutes} minutes`);
      questionData.timerDurationMinutes = Number(timerDurationMinutes);
    } else {
      console.log(`ℹ️ No timer added - timerDurationMinutes:`, timerDurationMinutes);
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      questionData.notes = notes.trim();
    }

    console.log(`📝 FINAL question data to save:`, questionData);

    // Use direct MongoDB insertion to ensure fields are saved
    const result = await DiscussionQuestion.collection.insertOne(questionData);
    
    console.log(`🔍 MongoDB insert result:`, {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });

    // Fetch the created document
    const createdQuestion = await DiscussionQuestion.collection.findOne({
      _id: result.insertedId
    });

    console.log(`✅ CREATED QUESTION from DB:`, {
      _id: createdQuestion?._id,
      timerDurationMinutes: createdQuestion?.timerDurationMinutes,
      promptText: createdQuestion?.promptText,
      order: createdQuestion?.order
    });

    // Also check via Mongoose
    const viaMongoose = await DiscussionQuestion.findById(result.insertedId);
    console.log(`✅ CREATED QUESTION via Mongoose:`, {
      _id: viaMongoose?._id,
      timerDurationMinutes: viaMongoose?.timerDurationMinutes,
      promptText: viaMongoose?.promptText
    });

    res.status(201).json(createdQuestion);
  } catch (err) {
    console.error("❌ Create question error:", err);
    res.status(500).json({ error: "Internal server error" });
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

// Additional routes to add to your existing session.ts file

/**
 * GET /api/sessions/:id/questions/duplicable
 * Get questions from a session that can be duplicated (with metadata)
 */
router.get("/:id/questions/duplicable", async (req, res: Response) => {
  try {
    const { id: sessionId } = req.params;

    console.log(`🔍 Fetching duplicable questions for session ${sessionId}`);

    const questions = await DiscussionQuestion.find({ sessionId })
      .sort({ order: 1 })
      .select('promptText order timerDurationMinutes notes createdAt originalQuestionId duplicatedFromSession')
      .lean();

    // Add metadata about duplication history
    const questionsWithMeta = questions.map(q => ({
      ...q,
      isDuplicate: !!q.originalQuestionId,
      canDuplicate: true // All questions can be duplicated
    }));

    console.log(`✅ Found ${questions.length} duplicable questions`);
    res.json(questionsWithMeta);
  } catch (err) {
    console.error("❌ Get duplicable questions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/sessions/:id/questions/bulk-duplicate
 * body: { sourceSessionId: string, questionIds: string[], startOrder?: number }
 * Duplicate multiple questions from another session
 */
router.post("/:id/questions/bulk-duplicate", async (req, res: Response) => {
  try {
    const { id: targetSessionId } = req.params;
    const { sourceSessionId, questionIds, startOrder } = req.body;

    console.log(`🔍 Bulk duplicating ${questionIds?.length} questions to session ${targetSessionId}`);

    // Validate input
    if (!sourceSessionId || !Types.ObjectId.isValid(sourceSessionId)) {
      return res.status(400).json({ error: "Valid sourceSessionId is required" });
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    if (!questionIds.every(id => Types.ObjectId.isValid(id))) {
      return res.status(400).json({ error: "All questionIds must be valid ObjectIds" });
    }

    // Get source questions
    const sourceQuestions = await DiscussionQuestion.find({
      _id: { $in: questionIds },
      sessionId: sourceSessionId
    }).sort({ order: 1 });

    if (sourceQuestions.length !== questionIds.length) {
      return res.status(404).json({ error: "Some questions not found in source session" });
    }

    // Determine starting order
    let currentOrder = startOrder;
    if (!currentOrder) {
      const lastQuestion = await DiscussionQuestion.findOne({ 
        sessionId: targetSessionId 
      }).sort({ order: -1 });
      currentOrder = (lastQuestion?.order || 0) + 1;
    }

    // Create duplicates
    const duplicates = [];
    for (const sourceQuestion of sourceQuestions) {
      const duplicate = sourceQuestion.duplicateTo(new Types.ObjectId(targetSessionId), currentOrder);
      const saved = await duplicate.save();
      duplicates.push(saved);
      currentOrder++;
    }

    console.log(`✅ Successfully duplicated ${duplicates.length} questions`);
    res.status(201).json(duplicates);
  } catch (err) {
    console.error("❌ Bulk duplicate questions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/sessions/my-recent
 * Get recent sessions for question duplication source
 * (This would need to be updated when user auth is implemented)
 */
router.get("/my-recent", async (req, res: Response) => {
  try {
    // For now, get recent sessions from the same org
    // TODO: Filter by current user when auth is implemented
    
    const limit = parseInt(req.query.limit as string) || 10;
    
    const recentSessions = await Session.find({})
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('title status createdAt updatedAt')
      .lean();

    // Add question count to each session
    const sessionsWithQuestionCount = await Promise.all(
      recentSessions.map(async (session) => {
        const questionCount = await DiscussionQuestion.countDocuments({ 
          sessionId: session._id 
        });
        return {
          ...session,
          questionCount
        };
      })
    );

    res.json(sessionsWithQuestionCount);
  } catch (err) {
    console.error("❌ Get recent sessions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add this to your session.ts route (the POST /api/sessions/:id/questions endpoint)

/**
 * POST /api/sessions/:id/questions
 * body: { order: number, promptText: string, timerDurationMinutes?: number, notes?: string }
 * Add a new question to a session
 */
// In your session.ts file, find and replace the POST /:id/questions route with this:

router.post("/:id/questions", async (req, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    
    console.log(`🔍 QUESTION CREATION - Raw request body:`, req.body);
    
    const { order, promptText, timerDurationMinutes, notes } = req.body;

    console.log(`🔍 QUESTION CREATION - Extracted fields:`, {
      order,
      promptText,
      timerDurationMinutes,
      notes,
      timerType: typeof timerDurationMinutes
    });

    // Validate input
    if (!promptText || typeof promptText !== 'string') {
      return res.status(400).json({ error: "promptText is required" });
    }

    if (!order || typeof order !== 'number') {
      return res.status(400).json({ error: "order is required and must be a number" });
    }

    // Create question data
    const questionData: any = {
      sessionId,
      order,
      promptText: promptText.trim(),
      isActive: false,
      timerExtendedMinutes: 0
    };

    // Add timer if provided
    if (timerDurationMinutes !== undefined && timerDurationMinutes !== null) {
      console.log(`⏰ ADDING TIMER to question data: ${timerDurationMinutes} minutes`);
      questionData.timerDurationMinutes = Number(timerDurationMinutes);
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      questionData.notes = notes.trim();
    }

    console.log(`📝 FINAL question data to save:`, questionData);

    // Use direct MongoDB insertion to ensure fields are saved
    const result = await DiscussionQuestion.collection.insertOne(questionData);
    
    console.log(`🔍 MongoDB insert result:`, {
      insertedId: result.insertedId,
      acknowledged: result.acknowledged
    });

    // Fetch the created document
    const createdQuestion = await DiscussionQuestion.collection.findOne({
      _id: result.insertedId
    });

    console.log(`✅ CREATED QUESTION from DB:`, {
      _id: createdQuestion?._id,
      timerDurationMinutes: createdQuestion?.timerDurationMinutes,
      promptText: createdQuestion?.promptText,
      order: createdQuestion?.order
    });

    // Also check via Mongoose
    const viaMongoose = await DiscussionQuestion.findById(result.insertedId);
    console.log(`✅ CREATED QUESTION via Mongoose:`, {
      _id: viaMongoose?._id,
      timerDurationMinutes: viaMongoose?.timerDurationMinutes,
      promptText: viaMongoose?.promptText
    });

    res.status(201).json(createdQuestion);
  } catch (err) {
    console.error("❌ Create question error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

