import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Group = { id: string; name: string; owner_id: string; created_at: string };

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});

  async function load() {
    const { groups } = await api<{ groups: Group[] }>("/groups");
    setGroups(groups);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api("/groups", { method: "POST", body: JSON.stringify({ name }) });
    setName("");
    load();
  }

  async function invite(groupId: string) {
    const email = inviteEmail[groupId];
    if (!email) return;
    await api("/invites", { method: "POST", body: JSON.stringify({ group_id: groupId, email }) });
    setInviteEmail({ ...inviteEmail, [groupId]: "" });
    alert("Invite sent");
  }

  return (
    <div>
      <h1>Groups</h1>
      <div className="card">
        <form onSubmit={create} className="row">
          <input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
          <button>Create group</button>
        </form>
      </div>

      {groups.map((g) => (
        <div key={g.id} className="card">
          <h3>{g.name}</h3>
          <div className="row" style={{ marginTop: 8 }}>
            <input
              placeholder="invite email"
              value={inviteEmail[g.id] ?? ""}
              onChange={(e) => setInviteEmail({ ...inviteEmail, [g.id]: e.target.value })}
            />
            <button onClick={() => invite(g.id)}>Invite</button>
          </div>
        </div>
      ))}
    </div>
  );
}
