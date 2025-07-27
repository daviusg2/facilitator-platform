// packages/api/src/routes/question.ts
import { Router, Response } from "express";
import * as RequireAuthMod from "../middleware/requireAuth";
const requireAuth =
  (RequireAuthMod as any).default ?? (RequireAuthMod as any);

import DiscussionQuestion from "../models/discussionQuestion";

const router = Router();

/**
 * PATCH /api/questions/:id/activate
 * body: { isActive?: boolean }
 * If body.isActive omitted, defaults to true (activate).
 */
router.patch("/:id/activate", requireAuth, async (req, res: Response) => {
  try {
    const { id } = req.params;
    const isActive =
      typeof req.body?.isActive === "boolean" ? req.body.isActive : true;

    const updated = await DiscussionQuestion.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error("Activate question error:", err);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;




