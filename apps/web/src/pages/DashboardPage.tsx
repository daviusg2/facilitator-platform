import { useEffect, useState } from "react";
import { listSessions, createSession } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface Session {
  _id: string;
  title: string;
  status: string;
  moduleType: string;
  orgId: string;
  facilitatorId: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { email, orgId } = useAuth(); // for display only
  const [sessions, setSessions] = useState<Session[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    listSessions(false).then(setSessions).catch(console.error);
  }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const created = await createSession(newTitle.trim());
    setSessions((prev) => [created, ...prev]);
    setNewTitle("");
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Facilitator Dashboard</h1>
      <p className="text-sm text-gray-600 mb-6">
        Signed in as <span className="font-medium">{email}</span>
        {orgId ? ` — Org: ${orgId}` : null}
      </p>

      <div className="flex gap-2 mb-6">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Session title"
          className="flex-1 border rounded px-3 py-2"
        />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded">
          Create session
        </button>
      </div>

      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s._id} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-gray-500">
                  {s.moduleType} • {s.status} • {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
              <a
                href={`/session/${s._id}`}
                className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                Open
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

