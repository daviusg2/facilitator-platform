// packages/api/src/middleware/requireAuth.ts
import type { NextFunction, Response } from "express";
import type { Request } from "express-serve-static-core";
import { verifyIdToken } from "../auth/verifyCognito";

export interface AuthedRequest extends Request {
  user?: any;
}

const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";

export default async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (DISABLE_AUTH) {
      req.user = {
        sub: "dev-user",
        email: "dev@example.com",
        name: "Dev User",
        "custom:orgId":
          process.env.DEV_ORG_ID ?? "6865e5b9c6e9cd5ce6d0686e",
      };
      return next();
    }

    const authz = req.headers.authorization || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing token" });

    const { payload } = await verifyIdToken(token);
    req.user = payload;
    return next();
  } catch (err: any) {
    console.error("Auth verify error:", err?.message || err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
