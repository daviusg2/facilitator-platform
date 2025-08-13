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
  
  console.log("🔍 SessionHostPage mounted - URL params:", params);
  console.log("🔍 sessionId:", id);

  const sessionId = id;
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [responses, setResponses] = useState<Record<string, ResponseDTO[]>>({}); 
  const [prompt, setPrompt] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  // Timer form state
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const [timerDuration, setTimerDuration] = useState<number | "">("");
  const [timerUnit, setTimerUnit] = useState<"minutes" | "hours">("minutes");
  const [questionNotes, setQuestionNotes] = useState("");

  // Timer countdown states for live display
  const [timerCountdowns, setTimerCountdowns] = useState<Record<string, number>>({});

  // Debug timer form state changes
  useEffect(() => {
    console.log("🔍 Timer form state changed:", {
      showTimerOptions,
      timerDuration,
      timerUnit,
      questionNotes
    });
  }, [showTimerOptions, timerDuration, timerUnit, questionNotes]);

  // Live timer countdown effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerCountdowns(prev => {
        const updated: Record<string, number> = {};
        let hasChanges = false;

        questions.forEach(question => {
          if (question.timerExpiresAt && question.isActive) {
            const now = new Date();
            const expires = new Date(question.timerExpiresAt);
            const remaining = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / 1000));
            
            if (prev[question._id] !== remaining) {
              hasChanges = true;
            }
            updated[question._id] = remaining;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [questions]);

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

    console.log("🔌 Setting up socket connection for session:", sessionId);

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
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, timerExpiresAt: data.expiresAt, timerStartedAt: data.startedAt }
          : q
      ));
    });

    sock.on("question-timer-extended", (data: any) => {
      console.log("⏰ Timer extended:", data);
      setQuestions(prev => prev.map(q => 
        q._id === data.questionId 
          ? { ...q, timerExpiresAt: data.newExpiresAt }
          : q
      ));
    });

    // Fetch initial questions
    listQuestions(sessionId)
      .then(async (data) => {
        console.log("✅ Questions loaded from API:", data);
        
        // Enhanced debugging for timer fields
        if (data && Array.isArray(data)) {
          data.forEach((q, index) => {
            console.log(`🔍 Question ${index + 1}:`, {
              id: q._id,
              text: q.promptText.substring(0, 50) + "...",
              timerDurationMinutes: q.timerDurationMinutes,
              hasTimer: !!q.timerDurationMinutes,
              isActive: q.isActive
            });
          });
        }
        
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
        setError("Failed to load questions: " + err.message);
      })
      .finally(() => {
        setInitialLoad(false);
      });

    // Cleanup socket on unmount
    return () => {
      console.log("🔌 Disconnecting host socket");
      sock.disconnect();
    };
  }, [sessionId]);

  const handleAdd = async () => {
    console.log("🔍 HANDLEADD called with state:", {
      prompt: prompt.trim(),
      sessionId,
      showTimerOptions,
      timerDuration,
      timerUnit
    });

    if (!prompt.trim() || !sessionId) {
      console.log("⚠️ Cannot add question: missing prompt or sessionId");
      return;
    }

    try {
      console.log("➕ Starting to add question...");
      
      // Calculate timer duration in minutes
      let timerMinutes: number | undefined = undefined;
      
      console.log("🔍 Timer calculation debug:", {
        showTimerOptions,
        timerDuration,
        timerDurationEmpty: timerDuration === "",
        timerDurationType: typeof timerDuration,
        timerUnit
      });

      if (showTimerOptions && timerDuration !== "" && timerDuration > 0) {
        timerMinutes = timerUnit === "hours" 
          ? Number(timerDuration) * 60 
          : Number(timerDuration);
        
        console.log("✅ Timer calculated:", {
          originalDuration: timerDuration,
          unit: timerUnit,
          calculatedMinutes: timerMinutes
        });
      } else {
        console.log("ℹ️ No timer will be added:", {
          showTimerOptions,
          timerDuration,
          isEmpty: timerDuration === ""
        });
      }

      const questionData = {
        order: questions.length + 1,
        promptText: prompt.trim(),
        ...(timerMinutes && timerMinutes > 0 && { timerDurationMinutes: timerMinutes }),
        ...(questionNotes.trim() && { notes: questionNotes.trim() })
      };

      console.log("🔍 FINAL QUESTION DATA TO SEND:", questionData);

      const newQ = await addQuestion(sessionId, questionData);

      console.log("✅ Question created by API:", {
        id: newQ._id,
        timerDurationMinutes: newQ.timerDurationMinutes,
        hasTimer: !!newQ.timerDurationMinutes
      });

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
      console.log(`🔄 Toggling question ${q._id}:`, {
        currentState: q.isActive,
        newState: !q.isActive,
        hasTimer: !!q.timerDurationMinutes,
        timerDuration: q.timerDurationMinutes
      });
      
      const upd = await toggleQuestion(q._id, { isActive: !q.isActive });
      
      console.log("✅ Question toggled, API response:", {
        id: upd._id,
        isActive: upd.isActive,
        timerStartedAt: upd.timerStartedAt,
        timerExpiresAt: upd.timerExpiresAt
      });
      
      setQuestions((prev) => prev.map((x) => (x._id === upd._id ? upd : x)));

      if (upd.isActive && socket) {
        console.log("📡 Broadcasting question activation");
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

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerStatus = (question: QuestionDTO) => {
    if (!question.timerExpiresAt || !question.isActive) return null;
    
    const countdown = timerCountdowns[question._id];
    if (countdown === undefined) return null;
    
    return countdown <= 0 ? "Timer expired" : formatCountdown(countdown);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 font-sans">
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
            console.log("📝 Form submitted!");
            handleAdd();
          }}
          className="space-y-4"
        >
          <div>
            <input
              id="question-prompt"
              name="prompt"
              value={prompt}
              onChange={(e) => {
                console.log("📝 Prompt changed:", e.target.value);
                setPrompt(e.target.value);
              }}
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
              onChange={(e) => {
                console.log("⏰ Timer checkbox toggled:", e.target.checked);
                setShowTimerOptions(e.target.checked);
              }}
              className="rounded"
            />
            <label htmlFor="enable-timer" className="text-sm font-medium">
              Add Timer
            </label>
          </div>

          {/* Timer Configuration */}
          {showTimerOptions && (
            <div className="bg-yellow-50 p-4 rounded border-2 border-yellow-200 space-y-3">
              <div className="text-sm font-semibold text-yellow-800">⏰ Timer Configuration</div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Duration:</label>
                <input
                  type="number"
                  min="1"
                  max={timerUnit === "hours" ? "8" : "480"}
                  value={timerDuration}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : "";
                    console.log("⏰ Timer duration changed:", value, typeof value);
                    setTimerDuration(value);
                  }}
                  className="border rounded px-2 py-1 w-20 text-center"
                  placeholder="10"
                />
                <select
                  value={timerUnit}
                  onChange={(e) => {
                    const unit = e.target.value as "minutes" | "hours";
                    console.log("⏰ Timer unit changed:", unit);
                    setTimerUnit(unit);
                  }}
                  className="border rounded px-2 py-1"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <p className="text-xs text-yellow-700">
                Timer will start when question is activated. Current: {timerDuration} {timerUnit}
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

      {/* Enhanced Debug Info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
        <div className="font-semibold mb-2">Debug Information:</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Session:</strong> {sessionId}</p>
            <p><strong>Questions:</strong> {questions.length}</p>
            <p><strong>Socket:</strong> {socket?.connected ? '✅ Connected' : '❌ Disconnected'}</p>
            <p><strong>Loading:</strong> {initialLoad ? '⏳ Yes' : '✅ No'}</p>
          </div>
          <div>
            <p><strong>Current prompt:</strong> "{prompt}"</p>
            <p><strong>Timer enabled:</strong> {showTimerOptions ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Timer duration:</strong> {timerDuration} {timerUnit}</p>
            <p><strong>Notes:</strong> "{questionNotes}"</p>
          </div>
        </div>
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
              <div key={q._id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      Question {q.order}: {q.promptText}
                    </h3>
                    
                    {/* Enhanced Timer Display */}
                    {q.timerDurationMinutes ? (
                      <div className="mt-2 p-2 bg-blue-50 rounded border">
                        <div className="text-sm text-blue-800">
                          ⏰ <strong>Timer:</strong> {formatTimerDisplay(q)}
                          {q.isActive && q.timerExpiresAt && (
                            <span className={`ml-2 font-bold ${
                              (timerCountdowns[q._id] || 0) <= 0 
                                ? 'text-red-600' 
                                : (timerCountdowns[q._id] || 0) <= 60 
                                  ? 'text-orange-600' 
                                  : 'text-green-600'
                            }`}>
                              ({getTimerStatus(q)})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Started: {q.timerStartedAt || 'Not started'} | 
                          Expires: {q.timerExpiresAt || 'Not set'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 mt-1">No timer set</div>
                    )}
                    
                    {q.notes && (
                      <p className="text-sm text-gray-600 mt-1 italic">📝 {q.notes}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleToggle(q)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      q.isActive
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {q.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* Responses */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Responses ({(responses[q._id] || []).length}):
                  </h4>
                  {(responses[q._id] || []).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No responses yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(responses[q._id] || []).map((resp) => (
                        <div
                          key={resp._id}
                          className="bg-gray-50 rounded p-3 text-sm border"
                        >
                          <p className="text-gray-800">{resp.bodyText}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(resp.createdAt).toLocaleString()}
                            {resp.participantId && ` • Participant: ${resp.participantId}`}
                          </p>
                        </div>
                      ))}
                    </div>
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
