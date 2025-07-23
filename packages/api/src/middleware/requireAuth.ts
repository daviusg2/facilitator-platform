import { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../auth/verifyCognito";
import { getOrCreateUser } from "../util/getOrCreateUser";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string;
        email?: string;
        role?: string;
        orgId: string;
        userId: string; // <-- ObjectId string
        raw?: any;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authz = req.header("Authorization");
  if (!authz?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  const token = authz.slice(7).trim();

  try {
    const claims = await verifyIdToken(token);

    // find/create user and org
    const u = await getOrCreateUser({
      sub: claims.sub!,
      email: claims.email,
      name: claims.name,
      role: claims["custom:role"],
      claimOrgId: claims["custom:orgId"],
    });

    req.auth = {
      sub: claims.sub!,
      email: claims.email,
      role: u.role,
      orgId: u.orgId.toString(),
      userId: u._id.toString(),
      raw: claims,
    };

    next();
  } catch (e: any) {
    console.error("Auth verify error:", e.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}


