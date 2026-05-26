import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

export default function AcceptInvite() {
  const { token } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState<"loading" | "needs_auth" | "accepting" | "done" | "error">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setStatus("needs_auth"); return; }
      setStatus("accepting");
      try {
        await api(`/invites/${token}/accept`, { method: "POST" });
        setStatus("done");
        setTimeout(() => nav("/groups"), 1500);
      } catch (e: any) {
        setErr(e.message);
        setStatus("error");
      }
    })();
  }, [token, nav]);

  return (
    <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
      {status === "loading" && <p>Loading…</p>}
      {status === "needs_auth" && (
        <>
          <p>Sign in to accept the invite.</p>
          <button onClick={() => nav(`/login?next=/invite/${token}`)}>Sign in</button>
        </>
      )}
      {status === "accepting" && <p>Accepting invite…</p>}
      {status === "done" && <p>Joined! Redirecting…</p>}
      {status === "error" && <p style={{ color: "crimson" }}>Error: {err}</p>}
    </div>
  );
}
