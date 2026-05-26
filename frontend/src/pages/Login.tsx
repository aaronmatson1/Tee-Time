import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "40px auto" }}>
      <h2>Sign in</h2>
      {sent ? (
        <p>Check your email for the magic link.</p>
      ) : (
        <>
          <form onSubmit={send}>
            <label>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%" }}
            />
            <button type="submit" style={{ marginTop: 12, width: "100%" }}>
              Send magic link
            </button>
          </form>
          <div style={{ textAlign: "center", margin: "12px 0" }} className="muted">or</div>
          <button onClick={google} className="ghost" style={{ width: "100%" }}>
            Continue with Google
          </button>
        </>
      )}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
