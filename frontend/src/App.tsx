import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function App() {
  const [email, setEmail] = useState<string | null>(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!email && !loc.pathname.startsWith("/login") && !loc.pathname.startsWith("/invite/")) {
      nav("/login", { replace: true });
    }
  }, [email, loc.pathname, nav]);

  return (
    <div className="app">
      <header className="nav">
        <Link to="/dashboard" className="brand">⛳ Tee-Time</Link>
        {email && (
          <nav>
            <Link to="/groups">Groups</Link>
            <Link to="/windows">Windows</Link>
            <Link to="/matches">Matches</Link>
            <button onClick={() => supabase.auth.signOut()}>Sign out</button>
          </nav>
        )}
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
