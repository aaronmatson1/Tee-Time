import { Router } from "express";
import { userClient } from "../lib/supabase.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const since = (req.query.since as string) ?? new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await sb
      .from("tee_time_matches")
      .select("*, courses(name, city, state)")
      .gte("first_seen_at", since)
      .eq("is_active", true)
      .order("tee_time_at");
    if (error) throw error;
    res.json({ matches: data });
  } catch (e) { next(e); }
});

export default router;
