import { Router } from "express";
import { z } from "zod";
import { userClient } from "../lib/supabase.js";

const router = Router();

const windowSchema = z.object({
  group_id: z.string().uuid().nullable().optional(),
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
});

router.get("/", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const groupId = req.query.group_id as string | undefined;
    let q = sb.from("windows").select("*").eq("user_id", req.userId!);
    if (groupId) q = q.eq("group_id", groupId);
    const { data, error } = await q.order("day_of_week").order("start_time");
    if (error) throw error;
    res.json({ windows: data });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const body = windowSchema.parse(req.body);
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb
      .from("windows")
      .insert({ ...body, user_id: req.userId! })
      .select()
      .single();
    if (error) throw error;
    res.json({ window: data });
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const { error } = await sb.from("windows").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
