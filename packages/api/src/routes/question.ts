// packages/api/src/routes/question.ts (Enhanced with timer and duplication)
import { Router, Response } from "express";
import { Types } from "mongoose";

// Use your exact import pattern
import DiscussionQuestion from "../models/discussionQuestion"; // Default export
import { DiscussionResponseModel } from "../models/discussionResponse"; // Named export
import { getIO } from "../server"; // Import the Socket.IO instance

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

    // Get all responses for this question including moderation fields
    const responses = await DiscussionResponseModel.find({ questionId })
      .sort({ isPinned: -1, createdAt: 1 }) // Pinned responses first, then chronological
      .lean();

    console.log(`✅ Found ${responses.length} responses for question ${questionId}`);
    res.json(responses);
  } catch (err) {
    console.error("❌ Get responses error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Simplified activation route - replace your existing PATCH /:id/activate route

// Replace your PATCH /:id/activate route with this direct MongoDB version

router.patch("/:id/activate", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

    console.log(`🔍 Toggling question ${id} to ${isActive ? 'active' : 'inactive'}`);

    // First, get the current question
    const question = await DiscussionQuestion.findById(id);
    if (!question) {
      console.log(`❌ Question ${id} not found`);
      return res.status(404).json({ error: "Not found" });
    }

    console.log(`🔍 BEFORE activation - current question:`, {
      timerDurationMinutes: question.timerDurationMinutes,
      timerStartedAt: question.timerStartedAt,
      timerExpiresAt: question.timerExpiresAt,
      isActive: question.isActive
    });

    // Prepare the update object
    const updateObject: any = {
      isActive: isActive,
      updatedAt: new Date()
    };

    // Add timer fields if activating a question with timer
    if (isActive && question.timerDurationMinutes && !question.timerStartedAt) {
      console.log(`⏰ SETTING UP TIMER - Duration: ${question.timerDurationMinutes} minutes`);
      
      const now = new Date();
      const totalMinutes = question.timerDurationMinutes + (question.timerExtendedMinutes || 0);
      const expiresAt = new Date(now.getTime() + totalMinutes * 60 * 1000);
      
      updateObject.timerStartedAt = now;
      updateObject.timerExpiresAt = expiresAt;
      
      console.log(`⏰ Timer setup:`, {
        startedAt: now,
        expiresAt: expiresAt,
        totalMinutes: totalMinutes
      });
    }

    console.log(`🔍 UPDATE OBJECT:`, updateObject);

    // Use direct MongoDB collection update
    const updateResult = await DiscussionQuestion.collection.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: updateObject }
    );

    console.log(`🔍 MongoDB update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });

    // Fetch the updated document directly from MongoDB
    const updatedFromDB = await DiscussionQuestion.collection.findOne(
      { _id: new Types.ObjectId(id) }
    );

    console.log(`🔍 AFTER update - from MongoDB:`, {
      timerDurationMinutes: updatedFromDB?.timerDurationMinutes,
      timerStartedAt: updatedFromDB?.timerStartedAt,
      timerExpiresAt: updatedFromDB?.timerExpiresAt,
      isActive: updatedFromDB?.isActive
    });

    // Also get it through Mongoose to see if there's a difference
    const updatedViaMongoose = await DiscussionQuestion.findById(id).lean();
    
    console.log(`🔍 AFTER update - via Mongoose:`, {
      timerDurationMinutes: updatedViaMongoose?.timerDurationMinutes,
      timerStartedAt: updatedViaMongoose?.timerStartedAt,
      timerExpiresAt: updatedViaMongoose?.timerExpiresAt,
      isActive: updatedViaMongoose?.isActive
    });

    if (!updatedFromDB) {
      return res.status(404).json({ error: "Question not found after update" });
    }

    console.log(`✅ Question ${id} updated successfully`);

    // Broadcast timer info if applicable
    try {
      const io = getIO();
      const sessionId = question.sessionId.toString();
      
      if (isActive && updatedFromDB.timerDurationMinutes && updatedFromDB.timerExpiresAt) {
        console.log(`📡 Broadcasting timer start event:`, {
          questionId: id,
          expiresAt: updatedFromDB.timerExpiresAt,
          durationMinutes: updatedFromDB.timerDurationMinutes
        });
        
        io.to(sessionId).emit("question-timer-started", {
          questionId: id,
          expiresAt: updatedFromDB.timerExpiresAt.toISOString(),
          durationMinutes: updatedFromDB.timerDurationMinutes + (updatedFromDB.timerExtendedMinutes || 0)
        });
      }
      
      // Broadcast the activation with the MongoDB data
      io.to(sessionId).emit("question-activated", updatedFromDB);
      
      console.log(`📡 Broadcasted question activation to session ${sessionId}`);
    } catch (socketError) {
      console.error("❌ Socket.IO broadcasting error:", socketError);
    }

    // Return the MongoDB data directly
    res.json(updatedFromDB);
  } catch (err) {
    console.error("❌ Activate question error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/questions/:id/extend-timer
 * body: { additionalMinutes: number }
 * Extend the timer for a question
 */
router.patch("/:id/extend-timer", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { additionalMinutes } = req.body;

    console.log(`🔍 Extending timer for question ${id} by ${additionalMinutes} minutes`);

    // Validate input
    if (!additionalMinutes || typeof additionalMinutes !== 'number' || additionalMinutes <= 0) {
      return res.status(400).json({ error: "additionalMinutes must be a positive number" });
    }

    if (additionalMinutes > 120) { // Max 2 hour extension at once
      return res.status(400).json({ error: "Cannot extend by more than 120 minutes at once" });
    }

    const question = await DiscussionQuestion.findById(id);
    if (!question) {
      console.log(`❌ Question ${id} not found`);
      return res.status(404).json({ error: "Question not found" });
    }

    if (!question.timerDurationMinutes) {
      return res.status(400).json({ error: "Question does not have a timer" });
    }

    if (!question.isActive) {
      return res.status(400).json({ error: "Question is not active" });
    }

    // Extend the timer
    question.extendTimer(additionalMinutes);
    const updated = await question.save();

    console.log(`✅ Timer extended for question ${id}, new expiration: ${question.timerExpiresAt}`);

    // Broadcast timer extension
    try {
      const io = getIO();
      const sessionId = question.sessionId.toString();
      
      io.to(sessionId).emit("question-timer-extended", {
        questionId: id,
        newExpiresAt: question.timerExpiresAt,
        additionalMinutes,
        totalDurationMinutes: question.timerDurationMinutes + (question.timerExtendedMinutes || 0)
      });
    } catch (socketError) {
      console.error("❌ Socket.IO broadcasting error:", socketError);
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Extend timer error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/questions/:id/duplicate
 * body: { targetSessionId: string, order?: number }
 * Duplicate a question to another session
 */
router.post("/:id/duplicate", async (req, res: Response) => {
  try {
    const { id } = req.params;
    const { targetSessionId, order } = req.body;

    console.log(`🔍 Duplicating question ${id} to session ${targetSessionId}`);

    // Validate input
    if (!targetSessionId || !Types.ObjectId.isValid(targetSessionId)) {
      return res.status(400).json({ error: "Valid targetSessionId is required" });
    }

    const originalQuestion = await DiscussionQuestion.findById(id);
    if (!originalQuestion) {
      console.log(`❌ Question ${id} not found`);
      return res.status(404).json({ error: "Question not found" });
    }

    // Determine order for the new question
    let newOrder = order;
    if (!newOrder) {
      // Find the highest order in the target session and add 1
      const lastQuestion = await DiscussionQuestion.findOne({ 
        sessionId: targetSessionId 
      }).sort({ order: -1 });
      newOrder = (lastQuestion?.order || 0) + 1;
    }

    // Create duplicate
    const duplicate = originalQuestion.duplicateTo(new Types.ObjectId(targetSessionId), newOrder);
    const savedDuplicate = await duplicate.save();

    console.log(`✅ Question duplicated successfully:`, savedDuplicate);

    res.status(201).json(savedDuplicate);
  } catch (err) {
    console.error("❌ Duplicate question error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/questions/:id/timer-status
 * Get current timer status for a question
 */
router.get("/:id/timer-status", async (req, res: Response) => {
  try {
    const { id } = req.params;

    const question = await DiscussionQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    const timerStatus = {
      hasTimer: !!question.timerDurationMinutes,
      isActive: question.isActive,
      durationMinutes: question.timerDurationMinutes,
      startedAt: question.timerStartedAt,
      expiresAt: question.timerExpiresAt,
      extendedMinutes: question.timerExtendedMinutes || 0,
      isExpired: question.isTimerExpired,
      remainingMinutes: question.remainingTimeMinutes
    };

    res.json(timerStatus);
  } catch (err) {
    console.error("❌ Get timer status error:", err);
    res.status(500).json({ error: "Internal server error" });
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

    // Check if question exists and get session info
    const question = await DiscussionQuestion.findById(questionId);
    if (!question) {
      console.log(`❌ Question ${questionId} not found`);
      return res.status(404).json({ error: "Question not found" });
    }

    // Check if question is active
    if (!question.isActive) {
      return res.status(400).json({ error: "Question is not active" });
    }

    // Note: We're not blocking responses after timer expires as per requirements
    // But we could add a warning in the response
    const timerWarning = question.isTimerExpired ? "Timer has expired" : null;

    // Create the response with default moderation values
    const response = await DiscussionResponseModel.create({
      questionId,
      participantId: null, // Anonymous responses
      bodyText: bodyText.trim(),
      // Default moderation fields (will use schema defaults)
      isHidden: false,
      isFlagged: false,
      isPinned: false
    });

    console.log(`✅ Response created:`, response);

    // Broadcast the new response to all clients in the session room
    try {
      const io = getIO();
      const sessionId = question.sessionId.toString(); // Convert ObjectId to string
      
      console.log(`📡 Broadcasting new response to session ${sessionId}`);
      io.to(sessionId).emit("new-response", response);
      
      console.log(`✅ Response broadcasted successfully`);
    } catch (socketError) {
      console.error("❌ Socket.IO broadcasting error:", socketError);
      // Don't fail the request if broadcasting fails - the response was still saved
    }

    // Include timer warning in response if applicable
    const responseData = timerWarning 
      ? { ...response.toObject(), warning: timerWarning }
      : response;

    res.status(201).json(responseData);
  } catch (err) {
    console.error("❌ Submit response error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;