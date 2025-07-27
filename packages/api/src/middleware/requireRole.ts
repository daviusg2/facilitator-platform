import { Request, Response, NextFunction } from "express";

export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
