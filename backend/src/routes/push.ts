import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

router.post("/subscribe", async (req, res, next) => {
  try {
    const body = z.object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
      user_agent: z.string().optional(),
    }).parse(req.body);

    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: req.userId!,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: body.user_agent,
      },
      { onConflict: "endpoint" }
    );
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get("/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? null });
});

export default router;
