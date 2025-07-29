// apps/web/src/pages/SessionHostPage.tsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listQuestions,
  addQuestion,
  activateQuestion,
  type QuestionDTO,
  type ResponseDTO,
} from "../lib/api";
import { useSessionSocket } from "../lib/useSocket";

export default function SessionHostPage() {
  const { id: sessionId } = useParams<{ id: string }>();

  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [promptText, setPromptText] = useState("");
  const [responses, setResponses] = useState<ResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load questions
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setErr(null);
    listQuestions(sessionId)
      .then((qs) => setQuestions(qs))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Subscribe to live socket events
  useSessionSocket(sessionId || "", (event) => {
    // Expect events like:
    //  - { type: "response:new", payload: ResponseDTO }
    //  - { type: "question:activated", payload: QuestionDTO }
    if (!event || !event.type) return;
    switch (event.type) {
      case "response:new": {
        const resp = event.payload as ResponseDTO;
        setResponses((prev) => [resp, ...prev]);
        break;
      }
      case "question:activated": {
        const updated = event.payload as QuestionDTO;
        setQuestions((prev) =>
          prev.map((q) => (q._id === updated._id ? updated : q))
        );
        break;
      }
      default:
        break;
    }
  });

  async function handleAdd() {
    if (!sessionId) return;
    const text = promptText.trim();
    if (!text) return;

    try {
      const created = await addQuestion(sessionId, {
        order: questions.length + 1,
        promptText: text,
      });
      setQuestions((prev) => [...prev, created]);
      setPromptText("");
    } catch (e: any) {
      alert(`Add question failed: ${e.message}`);
    }
  }

  async function handleToggle(q: QuestionDTO) {
    try {
      const updated = await activateQuestion(q._id, !q.isActive);
      setQuestions((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );
    } catch (e: any) {
      alert(`Toggle failed: ${e.message}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session Host</h1>
        {sessionId && (
          <span className="text-xs text-gray-500">Session ID: {sessionId}</span>
        )}
      </header>

      {/* Add-question form */}
      <section className="bg-white rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Add a question</h2>
        <div className="flex gap-2">
          <input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Type a question prompt…"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleAdd}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add
          </button>
        </div>
      </section>

      {/* Question list */}
      <section className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Questions</h2>
          {loading && <span className="text-sm text-gray-500">Loading…</span>}
        </div>
        {err && (
          <div className="mb-3 text-sm text-red-600">
            Failed to load: {err}
          </div>
        )}
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
                onClick={() => handleToggle(q)}
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
          {questions.length === 0 && !loading && (
            <li className="text-sm text-gray-500">No questions yet.</li>
          )}
        </ul>
      </section>

      {/* Live responses */}
      <section className="bg-white rounded-lg border p-4">
        <h2 className="text-lg font-semibold mb-2">Live Responses</h2>
        <ul className="space-y-1 max-h-64 overflow-y-auto border rounded p-3 bg-white">
          {responses.map((r) => (
            <li key={r._id} className="border-b last:border-0 pb-1">
              {r.bodyText}
            </li>
          ))}
          {responses.length === 0 && (
            <li className="text-sm text-gray-500">No responses yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}




