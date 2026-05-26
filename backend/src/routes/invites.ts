import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabaseAdmin, userClient } from "../lib/supabase.js";
import { sendEmail } from "../lib/email.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const body = z.object({
      group_id: z.string().uuid(),
      email: z.string().email(),
    }).parse(req.body);

    const sb = userClient(req.accessToken!);
    // verify caller is a member
    const { data: member } = await sb
      .from("group_members")
      .select("user_id")
      .eq("group_id", body.group_id)
      .eq("user_id", req.userId!)
      .maybeSingle();
    if (!member) return res.status(403).json({ error: "not_a_member" });

    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

    const { data, error } = await supabaseAdmin
      .from("group_invites")
      .insert({
        group_id: body.group_id,
        invited_email: body.email,
        invited_by: req.userId!,
        token,
        expires_at: expires,
      })
      .select()
      .single();
    if (error) throw error;

    const frontend = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
    await sendEmail({
      to: body.email,
      subject: "You're invited to a Tee-Time group",
      html: `<p>Join the group on Tee-Time:</p>
             <p><a href="${frontend}/invite/${token}">${frontend}/invite/${token}</a></p>`,
    });

    res.json({ invite: data });
  } catch (e) { next(e); }
});

router.post("/:token/accept", async (req, res, next) => {
  try {
    const token = req.params.token;
    const { data: invite, error } = await supabaseAdmin
      .from("group_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    if (!invite) return res.status(404).json({ error: "invite_not_found" });
    if (invite.accepted_at) return res.status(409).json({ error: "already_accepted" });
    if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "expired" });

    await supabaseAdmin.from("group_members").upsert({
      group_id: invite.group_id,
      user_id: req.userId!,
      role: "member",
    });
    await supabaseAdmin
      .from("group_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    res.json({ group_id: invite.group_id });
  } catch (e) { next(e); }
});

export default router;
