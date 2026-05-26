import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Window = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  group_id: string | null;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Windows() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [day, setDay] = useState(1);
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("19:30");

  async function load() {
    const { windows } = await api<{ windows: Window[] }>("/windows");
    setWindows(windows);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api("/windows", {
      method: "POST",
      body: JSON.stringify({ day_of_week: day, start_time: start, end_time: end }),
    });
    load();
  }

  async function del(id: string) {
    await api(`/windows/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1>Your windows</h1>
      <p className="muted">When you're available to play. We only ping you for tee-times that fit.</p>

      <div className="card">
        <form onSubmit={add} className="row">
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <span className="muted">to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          <button>Add</button>
        </form>
      </div>

      {windows.length === 0 && <p className="muted">No windows yet.</p>}
      {windows.map((w) => (
        <div key={w.id} className="card row" style={{ justifyContent: "space-between" }}>
          <span><b>{DAYS[w.day_of_week]}</b> {w.start_time} – {w.end_time}</span>
          <button className="ghost" onClick={() => del(w.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
