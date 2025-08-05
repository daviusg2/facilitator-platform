import { Router } from "express";
import DiscussionQuestion from "../models/discussionQuestion"; // Default export
import { DiscussionResponseModel } from "../models/discussionResponse"; // Named export
import { getIO } from "/Users/davidgoddard/Desktop/Facilitator-platform/packages/api/src/socket";

export const responseRouter = Router();

// POST /api/questions/:id/responses
responseRouter.post("/:id/responses", async (req, res, next) => {
  try {
    const question = await DiscussionQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ error: "Question not found" });

    const doc = await DiscussionResponseModel.create({
      ...req.body,
      questionId: question._id,
    });

    // emit to the session room
    const io = getIO();
    io.to(question.sessionId.toString()).emit("new-response", doc);

    res.status(201).json(doc);
  } catch (e) { next(e); }
});