import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import { listQuestions, addQuestion, toggleQuestion } from "../lib/api";
import type { QuestionDTO } from "../lib/api";

// Add response type
interface ResponseDTO {
  _id: string;
  questionId: string;
  participantId?: string;
  bodyText: string;
  createdAt: string;
}

export default function SessionHostPage() {
  const params = useParams();
  const { id } = useParams<{ id: string }>();
  
  console.log("🔍 All URL params:", params);
  console.log("🔍 id from useParams:", id);
  console.log("🔍 Current URL:", window.location.pathname);

  const sessionId = id;
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseDTO[]>>({}); // questionId -> responses[]
  const [prompt, setPrompt] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  // Timer form state
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | "">("");
  const [timerUnit, setTimerUnit] = useState<"minutes" | "hours">("minutes");
  const [questionNotes, setQuestionNotes] = useState("");

  // Fetch responses for a specific question
  const fetchResponses = async (questionId: string) => {
    try {
      const result = await fetch(`${import.meta.env.VITE_API_BASE}/api/questions/${questionId}/responses`);
      if (result.ok) {
        const questionResponses = await result.json();
        setResponses(prev => ({
          ...prev,
          [questionId]: questionResponses
        }));
      }
    } catch (err) {
      console.error("❌ Failed to fetch responses for question:", questionId, err);
    }
  };

  /* Initialize socket and fetch questions on mount */
  useEffect(() => {
    if (!sessionId) {
      console.log("❌ No sessionId found in URL params");
      setInitialLoad(false);
      return;
    }

    // Create socket connection
    const sock = io(import.meta.env.VITE_API_URL ?? "http://localhost:4000");
    sock.emit("join-session", sessionId);
    setSocket(sock);
    
    console.log("🔌 Host socket connected for session:", sessionId);

    // Listen for new responses
    sock.on("new-response", (response: ResponseDTO) => {
      console.log("📨 New response received via Socket.IO:", response);
      setResponses(prev => ({
        ...prev,
        [response.questionId]: [...(prev[response.questionId] || []), response]
      }));
    });

    // Listen for timer events
    sock.on("question-timer-started", (data: any) => {
      console.log("⏰ Timer started:", data);
      // Update question in state with timer info
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, timerExpiresAt: data.expiresAt, timerDurationMinutes: data.durationMinutes }
          : q
      ));
    });

    sock.on("question-timer-extended", (data: any) => {
      console.log("⏰ Timer extended:", data);
      // Update question in state with new expiration
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, timerExpiresAt: data.newExpiresAt }
          : q
      ));
    });

    // Add connection event listeners for debugging
    sock.on("connect", () => {
      console.log("✅ Socket connected with ID:", sock.id);
    });

    sock.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    sock.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
    });

    // Fetch initial questions
    listQuestions(sessionId)
      .then(async (data) => {
        console.log("✅ Raw API response:", data);
        console.log("✅ Response type:", typeof data);
        console.log("✅ Is array:", Array.isArray(data));
        console.log("📋 Questions loaded:", data);
        setQuestions(data || []);
        
        // Fetch responses for each question
        if (data && Array.isArray(data)) {
          for (const question of data) {
            await fetchResponses(question._id);
          }
        }
      })
      .catch((err) => {
        console.error("❌ Failed to load questions:", err);
        console.error("❌ Error details:", err.message);
        setError("Failed to load questions: " + err.message);
      })
      .finally(() => {
        console.log("🏁 Setting initialLoad to false");
        setInitialLoad(false);
      });

    // Cleanup socket on unmount
    return () => {
      console.log("🔌 Disconnecting host socket");
      sock.disconnect();
    };
  }, [sessionId]);

  const handleAdd = async () => {
    if (!prompt.trim() || !sessionId) {
      console.log("⚠️ Cannot add question: missing prompt or sessionId", { prompt, sessionId });
      return;
    }

    try {
      console.log("➕ Adding question:", prompt.trim());
      
      // Calculate timer duration in minutes
      let timerMinutes: number | undefined = undefined;
      if (showTimerOptions && timerDuration) {
        timerMinutes = timerUnit === "hours" 
          ? Number(timerDuration) * 60 
          : Number(timerDuration);
      }

      const questionData = {
        order: questions.length + 1,
        promptText: prompt.trim(),
        ...(timerMinutes && { timerDurationMinutes: timerMinutes }),
        ...(questionNotes.trim() && { notes: questionNotes.trim() })
      };

        console.log("🔍 FRONTEND DEBUG:");
    console.log("  showTimerOptions:", showTimerOptions);
    console.log("  timerDuration:", timerDuration);
    console.log("  timerUnit:", timerUnit);
    console.log("  calculated timerMinutes:", timerMinutes);
    console.log("  final questionData:", questionData);


      const newQ = await addQuestion(sessionId, questionData);

      console.log("✅ Question added:", newQ);
      setQuestions((prev) => [...prev, newQ]);
      
      // Reset form
      setPrompt("");
      setTimerDuration("");
      setQuestionNotes("");
      setShowTimerOptions(false);
      
      // Initialize empty responses array for new question
      setResponses(prev => ({
        ...prev,
        [newQ._id]: []
      }));
    } catch (error) {
      console.error("❌ Error adding question:", error);
      setError("Failed to add question");
    }
  };

  const handleToggle = async (q: QuestionDTO) => {
    try {
      console.log(`🔄 Toggling question ${q._id} to ${!q.isActive ? 'active' : 'inactive'}`);
      
      const upd = await toggleQuestion(q._id, { isActive: !q.isActive });
      console.log("✅ Question toggled:", upd);
      
      setQuestions((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));

      // Broadcast if question just went live
      if (upd.isActive && socket) {
        console.log("📡 Broadcasting question activation:", upd);
        socket.emit("question-activated", sessionId, upd);
      }
    } catch (error) {
      console.error("❌ Error toggling question:", error);
      setError("Failed to toggle question");
    }
  };

  const formatTimerDisplay = (question: QuestionDTO) => {
    if (!question.timerDurationMinutes) return null;
    
    const duration = question.timerDurationMinutes;
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${duration}m`;
  };

  const getTimerStatus = (question: QuestionDTO) => {
    if (!question.timerExpiresAt || !question.isActive) return null;
    
    const now = new Date();
    const expires = new Date(question.timerExpiresAt);
    const remaining = expires.getTime() - now.getTime();
    
    if (remaining <= 0) return "Timer expired";
    
    const minutes = Math.ceil(remaining / (1000 * 60));
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m remaining` : `${hours}h remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Session Host - {sessionId}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Question Form */}
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Add New Question</h2>
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            console.log("📝 Form submitted with prompt:", prompt);
            handleAdd();
          }}
          className="space-y-4"
        >
          <div>
            <input
              id="question-prompt"
              name="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your question"
              className="border rounded w-full px-3 py-2"
            />
          </div>

          {/* Timer Options Toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable-timer"
              checked={showTimerOptions}
              onChange={(e) => setShowTimerOptions(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="enable-timer" className="text-sm font-medium">
              Add Timer
            </label>
          </div>

          {/* Timer Configuration */}
          {showTimerOptions && (
            <div className="bg-gray-50 p-3 rounded border space-y-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Duration:</label>
                <input
                  type="number"
                  min="1"
                  max={timerUnit === "hours" ? "8" : "480"}
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(e.target.value ? Number(e.target.value) : "")}
                  className="border rounded px-2 py-1 w-20 text-center"
                  placeholder="10"
                />
                <select
                  value={timerUnit}
                  onChange={(e) => setTimerUnit(e.target.value as "minutes" | "hours")}
                  className="border rounded px-2 py-1"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <p className="text-xs text-gray-600">
                Timer will start when question is activated. Participants can still respond after timer expires.
              </p>
            </div>
          )}

          {/* Optional Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <input
              type="text"
              value={questionNotes}
              onChange={(e) => setQuestionNotes(e.target.value)}
              placeholder="Add notes about this question..."
              className="border rounded w-full px-3 py-2 text-sm"
              maxLength={500}
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            disabled={initialLoad || !prompt.trim()}
          >
            Add Question
          </button>
        </form>
      </div>

      {/* Debug Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        <p>Session ID: {sessionId}</p>
        <p>Questions loaded: {questions.length}</p>
        <p>Socket connected: {socket?.connected ? '✅' : '❌'}</p>
        <p>Current prompt: "{prompt}"</p>
        <p>URL: {window.location.pathname}</p>
        <p>Initial Load: {initialLoad ? '⏳' : '✅'}</p>
        <p>Total responses: {Object.values(responses).flat().length}</p>
      </div>

      {/* Questions and Responses */}
      {initialLoad ? (
        <p className="text-gray-500">Loading questions…</p>
      ) : (
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="p-6 text-gray-500 text-center border rounded">
              No questions yet. Add one above!
            </div>
          ) : (
            questions.map((q) => (
              <div key={q._id} className="border rounded-lg p-4 space-y-4">
                {/* Question Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">
                      <span className="text-gray-500 mr-2">{q.order}.</span>
                      {q.promptText}
                    </h3>
                    
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded ${
                        q.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {q.isActive ? 'LIVE' : 'DRAFT'}
                      </span>
                      
                      <span className="text-xs text-gray-500">
                        {responses[q._id]?.length || 0} responses
                      </span>

                      {/* Timer Info */}
                      {q.timerDurationMinutes && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          ⏰ {formatTimerDisplay(q)}
                        </span>
                      )}

                      {/* Active Timer Status */}
                      {q.isActive && q.timerExpiresAt && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          getTimerStatus(q)?.includes('expired') 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getTimerStatus(q)}
                        </span>
                      )}

                      {/* Duplicate indicator */}
                      {q.originalQuestionId && (
                        <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                          📋 Duplicate
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {q.notes && (
                      <p className="text-sm text-gray-600 mt-1 italic">
                        📝 {q.notes}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleToggle(q)}
                    className={
                      q.isActive
                        ? "px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                        : "px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    }
                  >
                    {q.isActive ? "Stop" : "Go Live"}
                  </button>
                </div>

                {/* Responses */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-gray-700">Responses:</h4>
                  {responses[q._id] && responses[q._id].length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {responses[q._id].map((response, index) => (
                        <div key={response._id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                          <p className="text-sm">{response.bodyText}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Response #{index + 1} • {new Date(response.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No responses yet.</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
