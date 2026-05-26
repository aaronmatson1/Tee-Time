import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth.js";
import { requireWorker } from "./middleware/worker.js";
import groupsRoutes from "./routes/groups.js";
import invitesRoutes from "./routes/invites.js";
import windowsRoutes from "./routes/windows.js";
import searchesRoutes from "./routes/searches.js";
import matchesRoutes from "./routes/matches.js";
import coursesRoutes from "./routes/courses.js";
import pushRoutes from "./routes/push.js";
import internalRoutes from "./routes/internal.js";

export function createServer() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // public
  app.use("/courses", coursesRoutes);

  // worker-only
  app.use("/internal", requireWorker, internalRoutes);

  // authed
  app.use(requireAuth);
  app.use("/groups", groupsRoutes);
  app.use("/invites", invitesRoutes);
  app.use("/windows", windowsRoutes);
  app.use("/searches", searchesRoutes);
  app.use("/matches", matchesRoutes);
  app.use("/push", pushRoutes);

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err);
    res.status(err.status ?? 500).json({ error: err.message ?? "internal_error" });
  });

  return app;
}
