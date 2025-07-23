import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSessions, createSession } from "../lib/api";
import { useOrgStore } from "../store/useOrgStore";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { orgId } = useOrgStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [title, setTitle] = useState("");

  // fetch on mount
  useEffect(() => {
    listSessions(orgId).then(setSessions).catch(console.error);
  }, [orgId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const newSession = await createSession(title);
    setSessions([newSession, ...sessions]);
    setTitle("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Sessions</h1>

      {/* New session form */}
      <div className="flex gap-2 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Session title"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      {/* Session list */}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s._id}
            className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
            onClick={() => navigate(`/session/${s._id}`)}
          >
            <div className="font-medium">{s.title}</div>
            <div className="text-sm text-gray-500">
              {new Date(s.createdAt).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
