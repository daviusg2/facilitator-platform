import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../auth/verifyCognito";

export default async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing token" });

    const claims = await verifyIdToken(token);
    // @ts-ignore attach claims
    req.user = claims;
    next();
  } catch (err) {
    console.error("Auth verify error:", (err as any)?.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

