import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Match = {
  id: string;
  tee_time_at: string;
  available_spots: number;
  total_price_cents: number | null;
  booking_deeplink: string;
  courses: { name: string; city: string | null; state: string | null } | null;
};

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => {
    api<{ matches: Match[] }>("/matches").then(({ matches }) => setMatches(matches));
  }, []);

  return (
    <div>
      <h1>Matches</h1>
      {matches.length === 0 && <p className="muted">No matches yet. Worker will fill these in.</p>}
      {matches.map((m) => (
        <div key={m.id} className="card row" style={{ justifyContent: "space-between" }}>
          <div>
            <b>{m.courses?.name ?? "Course"}</b>
            <div className="muted">{m.courses?.city}{m.courses?.state ? `, ${m.courses.state}` : ""}</div>
            <div>{new Date(m.tee_time_at).toLocaleString()} · {m.available_spots} spots
              {m.total_price_cents != null && ` · $${(m.total_price_cents / 100).toFixed(2)}`}
            </div>
          </div>
          <a href={m.booking_deeplink} target="_blank" rel="noreferrer">
            <button>Book</button>
          </a>
        </div>
      ))}
    </div>
  );
}
