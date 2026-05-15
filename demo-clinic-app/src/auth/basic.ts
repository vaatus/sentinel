import type { Request, Response, NextFunction } from "express";

// VIOLATION §164.312(a)(2)(i): hardcoded shared credentials.
// VIOLATION §164.312(d):       basic auth scheme is too weak for PHI.
const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "clinic-2024";

export function basicAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Basic ")) {
    return res.status(401).send("Unauthorized");
  }
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const [user, pass] = decoded.split(":");
  if (user === ADMIN_USER && pass === ADMIN_PASSWORD) return next();
  return res.status(401).send("Unauthorized");
}
