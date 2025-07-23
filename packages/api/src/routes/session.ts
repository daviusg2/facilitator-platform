import { Router } from "express";
import SessionModel from "../models/session";

const router = Router();

router.post("/", async (req, res) => {
  try {
    if (!req.auth) return res.status(401).json({ error: "Unauthenticated" });

    if ("orgId" in req.body || "facilitatorId" in req.body) {
      return res.status(400).json({ error: "Do not supply orgId/facilitatorId" });
    }

    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });

    const session = await SessionModel.create({
      orgId: req.auth.orgId,
      facilitatorId: req.auth.userId, // <-- ObjectId string
      title: title.trim(),
      moduleType: "discussion",
      status: "draft",
    });

    res.status(201).json(session);
  } catch (e: any) {
    console.error("Create session error:", e);
    res.status(500).json({ error: "Internal" });
  }
});

export default router;
