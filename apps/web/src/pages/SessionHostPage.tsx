import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listQuestions,
  addQuestion,
  updateQuestion,
} from "../lib/api";
import { useSessionSocket } from "../lib/useSocket";

interface Question {
  _id: string;
  order: number;
  promptText: string;
  isActive: boolean;
}

export default function SessionHostPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [promptText, setPromptText] = useState("");
  const [responses, setResponses] = useState<any[]>([]);

  /* ── 1. fetch questions once ─────────────────────────── */
  useEffect(() => {
    if (!sessionId) return;
    listQuestions(sessionId).then(setQuestions).catch(console.error);
  }, [sessionId]);

  /* ── 2. live responses socket ────────────────────────── */
  useSessionSocket(sessionId!, (data) =>
    setResponses((prev) => [...prev, data])
  );

  /* ── 3. add question ────────────────────────────────── */
  const handleAdd = async () => {
    if (!promptText.trim() || !sessionId) return;
    const newQ = await addQuestion(sessionId, {
      order: questions.length + 1,
      promptText,
    });
    setQuestions([...questions, newQ]);
    setPromptText("");
  };

  /* ── 4. toggle active ───────────────────────────────── */
  const toggleActive = async (q: Question) => {
    const updated = await updateQuestion(q._id, { isActive: !q.isActive });
    setQuestions((prev) =>
      prev.map((item) => (item._id === updated._id ? updated : item))
    );
    // ⚠️ emit happens on the server after PATCH, not here
  };

  /* ── 5. render ──────────────────────────────────────── */
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Session Host</h1>

      {/* add-question form */}
      <div className="flex gap-2 mb-6">
        <input
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="New question prompt"
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {/* question list */}
      <ul className="space-y-2">
        {questions.map((q) => (
          <li
            key={q._id}
            className="border rounded p-3 flex justify-between items-center"
          >
            <div>
              <span className="font-medium mr-2">{q.order}.</span>
              {q.promptText}
            </div>
            <button
              onClick={() => toggleActive(q)}
              className={`px-3 py-1 rounded text-sm ${
                q.isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {q.isActive ? "Live" : "Go Live"}
            </button>
          </li>
        ))}
      </ul>

      {/* live responses */}
      <h2 className="text-lg font-semibold mt-8 mb-2">Live Responses</h2>
      <ul className="space-y-1 max-h-64 overflow-y-auto border rounded p-3 bg-white">
        {responses.map((r) => (
          <li key={r._id} className="border-b last:border-0 pb-1">
            {r.bodyText}
          </li>
        ))}
      </ul>
    </div>
  );
}


