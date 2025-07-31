import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  submitResponse,
} from "../lib/api";
import type activateQuestion from "../lib/api";

import { io } from "socket.io-client";

interface Question {
  _id: string;
  promptText: string;
}

export default function JoinPage() {
  const { code: sessionId } = useParams<{ code: string }>();
  const [question, setQuestion] = useState<Question | null>(null);
  const [text, setText] = useState("");

  // fetch active Q on mount
  useEffect(() => {
    if (!sessionId) return;
    getActiveQuestion(sessionId)
      .then((arr) => setQuestion(arr[0] ?? null))
      .catch(console.error);

    // live updates
    const sock = io("http://localhost:4000");
    sock.emit("join-session", sessionId);
    sock.on("question-activated", (q: Question) => setQuestion(q));
    return () => sock.disconnect();
  }, [sessionId]);

  const handleSend = async () => {
    if (!question || !text.trim()) return;
    await submitResponse(question._id, text);
    setText("");                 // clear box
    alert("Sent!");              // temporary UX
  };

  if (!question)
    return <p className="p-6 text-center">Waiting for the facilitator…</p>;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-xl font-semibold mb-4">{question.promptText}</h1>

      <textarea
        rows={4}
        className="w-full max-w-md border rounded p-3 mb-4"
        placeholder="Type your response here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={handleSend}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Submit
      </button>
    </div>
  );
}
