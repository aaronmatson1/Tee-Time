import { Router } from "express";
import { z } from "zod";
import { userClient } from "../lib/supabase.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb
      .from("groups")
      .select("id, name, owner_id, created_at, group_members(user_id, role)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ groups: data });
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const body = z.object({ name: z.string().min(1).max(80) }).parse(req.body);
    const sb = userClient(req.accessToken!);
    const { data, error } = await sb
      .from("groups")
      .insert({ name: body.name, owner_id: req.userId! })
      .select()
      .single();
    if (error) throw error;
    res.json({ group: data });
  } catch (e) { next(e); }
});

export default router;
