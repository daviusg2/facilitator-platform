import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listQuestions,
  addQuestion,
  toggleQuestion,
} from "../lib/api";
import type QuestionDTO from "../lib/api";

export default function SessionHostPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [prompt, setPrompt] = useState("");

  /* fetch questions on mount */
  useEffect(() => {
    if (!sessionId) return;
    listQuestions(sessionId).then(setQuestions).catch(console.error);
  }, [sessionId]);

  const handleAdd = async () => {
    if (!prompt.trim() || !sessionId) return;
    const q = await addQuestion(sessionId, {
      order: questions.length + 1,
      promptText: prompt.trim(),
    });
    setQuestions((prev) => [...prev, q]);
    setPrompt("");
  };

  const handleToggle = async (q: QuestionDTO) => {
    const upd = await toggleQuestion(q._id, !q.isActive);
    setQuestions((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Session Host</h1>

      <div className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="New question"
          className="border rounded flex-1 px-3 py-2"
        />
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 rounded"
        >
          Add
        </button>
      </div>

      <ul className="divide-y border rounded">
        {questions.map((q) => (
          <li key={q._id} className="p-3 flex justify-between">
            <span>
              <b className="mr-1">{q.order}.</b>
              {q.promptText}
            </span>
            <button
              onClick={() => handleToggle(q)}
              className={
                q.isActive
                  ? "px-3 py-1 text-white bg-blue-600 rounded"
                  : "px-3 py-1 bg-gray-200 rounded"
              }
            >
              {q.isActive ? "Live" : "Go live"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}






