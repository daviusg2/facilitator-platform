import { useEffect, useState } from "react";
import { useAuthActions } from "../context/AuthContext";
import { listSessions, createSession } from "../lib/api";
import type SessionDTO from "../lib/api";
import { useOrgStore } from "../store/useOrgStore";

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const { orgId } = useOrgStore();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    listSessions(orgId)
      .then(setSessions)
      .catch((e) => console.error("listSessions error", e));
  }, [orgId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const s = await createSession(title.trim(), orgId);
      setSessions((p) => [...p, s]);
      setTitle("");
    } catch (e) {
      console.error("createSession error", e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Facilitator Dashboard</h1>
        <button onClick={signOut} className="text-sm text-blue-600">
          Sign out
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">Create session</h2>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            className="border rounded px-3 py-2 flex-1"
          />
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white rounded px-4"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions yet.</p>
        ) : (
          <ul className="border rounded divide-y">
            {sessions.map((s) => (
              <li key={s._id} className="p-3 flex justify-between">
                <span>{s.title}</span>
                <span className="text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}



