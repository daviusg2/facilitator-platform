import { Router } from "express";

const meRouter = Router();

meRouter.get("/", (req, res) => {
  if (!req.auth) return res.status(401).json({ error: "Unauthenticated" });
  const { sub, email, role, orgId, userId } = req.auth;
  res.json({ sub, email, role, orgId, userId });
});

export default meRouter;

