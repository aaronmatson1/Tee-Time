import { Router } from "express";
import { z } from "zod";
import { userClient } from "../lib/supabase.js";

const router = Router();

const searchSchema = z.object({
  group_id: z.string().uuid(),
  origin_lat: z.number(),
  origin_lng: z.number(),
  radius_miles: z.number().int().min(1).max(200).default(25),
  party_size: z.number().int().min(1).max(6).default(2),
  holes: z.union([z.literal(9), z.literal(18)]).default(18),
  max_price_cents: z.number().int().positive().optional(),
  lookahead_days: z.number().int().min(1).max(60).default(14),
});

router.get("/", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb.from("search_jobs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ searches: data });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const body = searchSchema.parse(req.body);
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb.from("search_jobs").insert(body).select().single();
    if (error) throw error;
    res.json({ search: data });
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb
      .from("search_jobs")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ search: data });
  } catch (e) { next(e); }
});

export default router;
