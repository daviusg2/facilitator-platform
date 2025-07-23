// packages/api/src/routes/questionActions.ts
import { Router } from "express";
import { DiscussionQuestionModel } from "../models/discussionQuestion";

export const questionActionsRouter = Router();

/* PATCH /api/questions/:id/activate */
questionActionsRouter.patch("/:id/activate", async (req, res, next) => {
  try {
    const doc = await DiscussionQuestionModel.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: "Question not found" });
    res.json(doc);

    // Broadcast to participants
    const io = require("../socket").getIO();
    io.to(doc.sessionId.toString()).emit("question-activated", doc);
  } catch (err) {
    next(err);
  }
});
