import { Router } from "express";
import { DiscussionQuestionModel } from "../models/discussionQuestion";

export const questionRouter = Router({ mergeParams: true });


/* ─── List questions for a session (NEW) ───────────────────── */
questionRouter.get("/", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const qs = await DiscussionQuestionModel.find({ sessionId }).sort({ order: 1 });
    res.json(qs);
  } catch (err) {
    next(err);
  }
});
/*──────────────────────────────────────────────────────────────
  POST /api/sessions/:sessionId/questions
──────────────────────────────────────────────────────────────*/
questionRouter.post("/", async (req, res, next) => {
  try {
    const { sessionId } = req.params;                // comes from mergeParams
    const doc = await DiscussionQuestionModel.create({
      ...req.body,
      sessionId,
    });
    return res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

/*──────────────────────────────────────────────────────────────
  PATCH /api/questions/:id/activate
──────────────────────────────────────────────────────────────*/
questionRouter.patch("/:id/activate", async (req, res, next) => {
  try {
    const doc = await DiscussionQuestionModel.findByIdAndUpdate(
      req.params.id,
      { isActive: req.body.isActive },
      { new: true }
    );
    return res.json(doc);
  } catch (err) {
    next(err);
  }
});

