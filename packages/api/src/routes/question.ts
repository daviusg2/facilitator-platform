// packages/api/src/routes/question.ts
import { Router } from "express";
import { Types } from "mongoose";
import DiscussionQuestion from "../models/discussionQuestion"; // <-- check path

const router = Router();

/**
 * PATCH /api/questions/:id
 * Generic partial update (e.g. { promptText, order, isActive })
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid question id" });
    }

    const updated = await DiscussionQuestion.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e: any) {
    console.error("Update question error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

/**
 * PATCH /api/questions/:id/activate
 * Convenience endpoint to toggle isActive flag
 */
router.patch("/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid question id" });
    }

    const q = await DiscussionQuestion.findById(id);
    if (!q) return res.status(404).json({ error: "Not found" });

    q.isActive = !q.isActive;
    await q.save();

    // If you emit socket event here, import your io getter:
    // getIO().to(q.sessionId.toString()).emit("question-activated", q);

    res.json(q.toObject());
  } catch (e: any) {
    console.error("Activate question error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;


