import type { Request, Response, NextFunction } from "express";

export function requireWorker(req: Request, res: Response, next: NextFunction) {
  const secret = req.header("X-Worker-Secret");
  if (!secret || secret !== process.env.WORKER_SECRET) {
    return res.status(401).json({ error: "worker_auth_failed" });
  }
  next();
}
