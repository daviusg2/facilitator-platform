// packages/api/src/routes/question.ts
import { Router, Response } from "express";
import * as RequireAuthMod from "../middleware/requireAuth";
const requireAuth =
  (RequireAuthMod as any).default ?? (RequireAuthMod as any);

// Use the correct imports based on your actual model files
import DiscussionQuestion from "../models/discussionQuestion"; // Default export
import { DiscussionResponseModel } from "../models/discussionResponse"; // Named export

// Import Socket.IO instance from server
import { getIO } from "../server";

const router = Router();

/**
 * GET /api/questions/:id/responses
 * Get all responses for a question
 */
router.get("/:id/responses", async (req, res: Response) => {
  try {
    const { id: questionId } = req.params;

    console.log(`🔍 Fetching responses for question ${questionId}`);

    // Check if question exists
    const question = await DiscussionQuestion.findById(questionId);
    if (!question) {
      console.log(`❌ Question ${questionId} not found`);
      return res.status(404).json({ error: "Question not found" });
    }

    // Get all responses for this question
    const responses = await DiscussionResponseModel.find({ questionId })
      .sort({ createdAt: 1 }) // Oldest first
      .lean();

    console.log(`✅ Found ${responses.length} responses for question ${questionId}`);
    res.json(responses);
  } catch (err) {
    console.error("❌ Get responses error:", err);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * PATCH /api/questions/:id/activate
 * body: { isActive?: boolean }
 * If body.isActive omitted, defaults to true (activate).
 */
router.patch("/:id/activate", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const isActive =
      typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

    console.log(`🔍 Toggling question ${id} to ${isActive ? 'active' : 'inactive'}`);

    const updated = await DiscussionQuestion.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    ).lean();

    if (!updated) {
      console.log(`❌ Question ${id} not found`);
      return res.status(404).json({ error: "Not found" });
    }

    console.log(`✅ Question ${id} toggled successfully:`, updated);
    res.json(updated);
  } catch (err) {
    console.error("❌ Activate question error:", err);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * POST /api/questions/:id/responses
 * body: { bodyText: string }
 * Submit a response to a question
 */
router.post("/:id/responses", async (req, res: Response) => {
  try {
    const { id: questionId } = req.params;
    const { bodyText } = req.body;

    console.log(`🔍 Submitting response to question ${questionId}:`, bodyText);

    // Validate input
    if (!bodyText || typeof bodyText !== 'string' || !bodyText.trim()) {
      return res.status(400).json({ error: "bodyText is required" });
    }

    // Check if question exists
    const question = await DiscussionQuestion.findById(questionId);
    if (!question) {
      console.log(`❌ Question ${questionId} not found`);
      return res.status(404).json({ error: "Question not found" });
    }

    // Create the response
    const response = await DiscussionResponseModel.create({
      questionId,
      participantId: null, // We can set this to null for anonymous responses
      bodyText: bodyText.trim(),
      createdAt: new Date()
    });

    console.log(`✅ Response created:`, response);

    // Emit to Socket.IO for real-time updates
    try {
      const io = getIO();
      if (io) {
        console.log(`📡 Emitting new-response event to session: ${question.sessionId}`);
        io.to(question.sessionId.toString()).emit("new-response", response);
      } else {
        console.log("⚠️ Socket.IO not available for real-time updates");
      }
    } catch (socketErr) {
      console.error("❌ Error emitting socket event:", socketErr);
    }

    res.status(201).json(response);
  } catch (err) {
    console.error("❌ Submit response error:", err);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;


