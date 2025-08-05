import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  submitResponse,
  getActiveQuestion,
} from "../lib/api";
import type { QuestionDTO } from "../lib/api";
import { io, Socket } from "socket.io-client";

export default function JoinPage() {
  const { code } = useParams<{ code: string }>(); // Changed to match /join/:code route
  const sessionId = code; // Use code as sessionId
  const [question, setQuestion] = useState<QuestionDTO | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("🔍 JoinPage - code from params:", code);
  console.log("🔍 JoinPage - URL:", window.location.pathname);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Create socket connection
    const sock: Socket = io(
      import.meta.env.VITE_API_URL ?? "http://localhost:4000"
      // Remove withCredentials: true - this was causing the CORS issue
    );

    sock.emit("join-session", sessionId);
    console.log("🔌 Participant joined session:", sessionId);

    // Listen for new questions being activated
    sock.on("question-activated", (q: QuestionDTO) => {
      console.log("📢 New question activated:", q);
      setQuestion(q);
    });

    // Fetch current active question on mount
    getActiveQuestion(sessionId)
      .then((activeQ) => {
        console.log("📋 Current active question:", activeQ);
        setQuestion(activeQ);
      })
      .catch((err) => {
        console.log("ℹ️ No active question found:", err);
        // This is expected if no question is active yet
      })
      .finally(() => setLoading(false));

    return () => {
      console.log("🔌 Disconnecting participant socket");
      sock.disconnect();
    };
  }, [sessionId]);

  const handleSend = async () => {
    if (!question || !text.trim()) {
      console.log("⚠️ Cannot submit: missing question or text", { question: !!question, text });
      return;
    }

    try {
      console.log("📤 Submitting response:", text);
      await submitResponse(question._id, text);
      setText("");
      console.log("✅ Response submitted successfully");
      
      // Better UX than alert
      setError("Response submitted! ✅");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("❌ Error submitting response:", err);
      setError("Failed to submit response");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-semibold mb-4">Waiting for questions...</h2>
        <p className="text-gray-600 mb-4">The facilitator hasn't activated a question yet.</p>
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          Session ID: {sessionId}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6">
      {error && (
        <div className={`mb-4 p-3 rounded ${
          error.includes('✅') 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {error}
        </div>
      )}

      <h1 className="text-xl font-semibold mb-4 text-center max-w-md">
        {question.promptText}
      </h1>

      <textarea
        rows={4}
        className="w-full max-w-md border rounded p-3 mb-4"
        placeholder="Type your response here"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Submit Response
      </button>

      <div className="mt-4 text-xs text-gray-500">
        Question {question.order} • Session: {sessionId}
      </div>
    </div>
  );
}