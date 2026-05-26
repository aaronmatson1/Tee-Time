import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { sendEmail } from "../lib/email.js";
import { sendPush } from "../lib/push.js";

const router = Router();

// Worker posts a batch of new matches; backend fans out notifications.
router.post("/notify-matches", async (req, res, next) => {
  try {
    const body = z.object({ match_ids: z.array(z.string().uuid()).min(1) }).parse(req.body);

    const { data: matches, error } = await supabaseAdmin
      .from("tee_time_matches")
      .select("id, tee_time_at, booking_deeplink, available_spots, search_job_id, courses(name, city, state)")
      .in("id", body.match_ids)
      .is("notified_at", null);
    if (error) throw error;
    if (!matches?.length) return res.json({ notified: 0 });

    let notifiedCount = 0;

    for (const m of matches) {
      const { data: sj } = await supabaseAdmin
        .from("search_jobs")
        .select("group_id")
        .eq("id", m.search_job_id)
        .single();
      if (!sj) continue;

      const { data: members } = await supabaseAdmin
        .from("group_members")
        .select("user_id, profiles:profiles(display_name)")
        .eq("group_id", sj.group_id);

      for (const mem of members ?? []) {
        const userId = mem.user_id;

        const { data: prefs } = await supabaseAdmin
          .from("notification_prefs")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
        const email = user?.user?.email;

        const course = Array.isArray(m.courses) ? m.courses[0] : m.courses;
        const courseName = course?.name ?? "Unknown course";
        const subject = `Tee-time match: ${courseName} ${new Date(m.tee_time_at).toLocaleString()}`;
        const html = `
          <p>New tee-time matching your group's windows:</p>
          <ul>
            <li><b>${courseName}</b> — ${course?.city ?? ""}, ${course?.state ?? ""}</li>
            <li>${new Date(m.tee_time_at).toLocaleString()}</li>
            <li>${m.available_spots} spots open</li>
          </ul>
          <p><a href="${m.booking_deeplink}">Book on foreUP →</a></p>
        `;

        if ((prefs?.email_enabled ?? true) && email) {
          await sendEmail({ to: email, subject, html });
        }

        if (prefs?.push_enabled) {
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", userId);
          for (const s of subs ?? []) {
            try {
              await sendPush(s, {
                title: "Tee-time match",
                body: `${courseName} @ ${new Date(m.tee_time_at).toLocaleString()}`,
                url: m.booking_deeplink,
              });
            } catch (e) {
              console.warn("push send failed", e);
            }
          }
        }
      }

      await supabaseAdmin
        .from("tee_time_matches")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", m.id);
      notifiedCount++;
    }

    res.json({ notified: notifiedCount });
  } catch (e) { next(e); }
});

export default router;
