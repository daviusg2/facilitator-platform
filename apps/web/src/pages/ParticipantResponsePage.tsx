import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  submitResponse,
  getActiveQuestion,
} from "../lib/api";
import type { QuestionDTO } from "../lib/api";
import { io, Socket } from "socket.io-client";

interface ParticipantResponse {
  _id: string;
  bodyText: string;
  createdAt: string;
  canEdit: boolean;
}

export default function ParticipantResponsePage() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = code;
  
  // Participant identification
  const [participantName, setParticipantName] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [isIdentified, setIsIdentified] = useState(false);
  
  // Question and response state
  const [question, setQuestion] = useState<QuestionDTO | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Response management
  const [myResponses, setMyResponses] = useState<ParticipantResponse[]>([]);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Check if participant identification is enabled (from URL params or settings)
  const requiresIdentification = searchParams.get('identify') === 'true' || true; // Enable by default for MVP

  console.log("🔍 ParticipantResponsePage - code from params:", code);
  console.log("🔍 ParticipantResponsePage - URL:", window.location.pathname);

  // Handle participant identification
  const handleIdentification = () => {
    if (!participantName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    // Generate a simple participant ID (could be enhanced with better ID generation)
    const id = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setParticipantId(id);
    setIsIdentified(true);
    setError(null);
    
    // Store in localStorage for session persistence
    localStorage.setItem(`participant_${sessionId}`, JSON.stringify({
      name: participantName,
      id: id,
      timestamp: Date.now()
    }));
  };

  // Load participant info from localStorage if available
  useEffect(() => {
    if (!requiresIdentification) {
      setIsIdentified(true);
      return;
    }

    const stored = localStorage.getItem(`participant_${sessionId}`);
    if (stored) {
      try {
        const { name, id } = JSON.parse(stored);
        setParticipantName(name);
        setParticipantId(id);
        setIsIdentified(true);
      } catch (e) {
        console.log("Failed to parse stored participant info");
      }
    }
  }, [sessionId, requiresIdentification]);

  // Timer countdown effect
  useEffect(() => {
    if (!question?.timerExpiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(question.timerExpiresAt!);
      const remaining = expires.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setTimeRemaining(0);
        return;
      }
      
      setTimeRemaining(Math.ceil(remaining / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [question?.timerExpiresAt]);

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  // Socket connection and event handling
  useEffect(() => {
    if (!sessionId || !isIdentified) {
      setLoading(false);
      return;
    }

    const sock: Socket = io(
      import.meta.env.VITE_API_URL ?? "http://localhost:4000"
    );

    sock.emit("join-session", sessionId);
    setSocket(sock);
    console.log("🔌 Participant joined session:", sessionId);

    // Listen for new questions being activated
    sock.on("question-activated", (q: QuestionDTO) => {
      console.log("📢 New question activated:", q);
      setQuestion(q);
      // Clear current response when new question is activated
      setText("");
      setEditingResponseId(null);
    });

    // Listen for timer events
    sock.on("question-timer-started", (data: any) => {
      console.log("⏰ Timer started:", data);
      setQuestion(prev => prev ? {
        ...prev,
        timerExpiresAt: data.expiresAt,
        timerDurationMinutes: data.durationMinutes
      } : null);
    });

    sock.on("question-timer-extended", (data: any) => {
      console.log("⏰ Timer extended:", data);
      setQuestion(prev => prev ? {
        ...prev,
        timerExpiresAt: data.newExpiresAt
      } : null);
    });

    // Fetch current active question on mount
    getActiveQuestion(sessionId)
      .then((activeQ) => {
        console.log("📋 Current active question:", activeQ);
        setQuestion(activeQ);
      })
      .catch((err) => {
        console.log("ℹ️ No active question found:", err);
      })
      .finally(() => setLoading(false));

    return () => {
      console.log("🔌 Disconnecting participant socket");
      sock.disconnect();
    };
  }, [sessionId, isIdentified]);

  const handleSubmit = async () => {
    if (!question || !text.trim()) {
      console.log("⚠️ Cannot submit: missing question or text", { question: !!question, text });
      return;
    }

    try {
      console.log("📤 Submitting response:", text);
      
      // Include participant info in the response
      const responseData = {
        bodyText: text,
        ...(participantId && { participantId }),
        ...(participantName && { participantName })
      };
      
      await submitResponse(question._id, responseData.bodyText);
      
      // Add to local responses list
      const newResponse: ParticipantResponse = {
        _id: `temp_${Date.now()}`,
        bodyText: text,
        createdAt: new Date().toISOString(),
        canEdit: true
      };
      
      setMyResponses(prev => [...prev, newResponse]);
      setText("");
      console.log("✅ Response submitted successfully");
      
      setError("Response submitted! ✅");
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error("❌ Error submitting response:", err);
      setError("Failed to submit response");
    }
  };

  const handleEditResponse = (response: ParticipantResponse) => {
    setEditingResponseId(response._id);
    setEditText(response.bodyText);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    
    // Update local state (in a real implementation, you'd call an API)
    setMyResponses(prev => prev.map(resp => 
      resp._id === editingResponseId 
        ? { ...resp, bodyText: editText, canEdit: true }
        : resp
    ));
    
    setEditingResponseId(null);
    setEditText("");
    setError("Response updated! ✅");
    setTimeout(() => setError(null), 2000);
  };

  const handleCancelEdit = () => {
    setEditingResponseId(null);
    setEditText("");
  };

  // Show identification form if required and not identified
  if (requiresIdentification && !isIdentified) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 bg-gray-50 font-sans">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome!</h2>
          <p className="text-gray-600 mb-6 text-center">Please enter your name to join the session</p>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleIdentification();
                }
              }}
            />
            <button
              onClick={handleIdentification}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              disabled={!participantName.trim()}
            >
              Join Session
            </button>
          </div>
          
          <div className="mt-6 text-center text-xs text-gray-500">
            Session ID: {sessionId}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50 font-sans">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Waiting for questions...</h2>
          <p className="text-gray-600 mb-6">The facilitator hasn't activated a question yet.</p>
          
          {participantName && (
            <p className="text-sm text-blue-600 mb-4">
              Welcome, {participantName}!
            </p>
          )}
          
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
            Session ID: {sessionId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Live Session</h1>
            {participantName && (
              <p className="text-sm text-gray-600">Welcome, {participantName}</p>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Session: {sessionId?.slice(-8)}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {error && (
          <div className={`p-4 rounded-lg ${
            error.includes('✅') 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {error}
          </div>
        )}

        {/* Timer Display */}
        {question.timerDurationMinutes && (
          <div className={`p-4 rounded-lg border-2 ${
            timeRemaining === null 
              ? 'bg-blue-50 border-blue-200'
              : timeRemaining <= 0 
                ? 'bg-red-50 border-red-200'
                : timeRemaining <= 60 
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                ⏰ Timer: {question.timerDurationMinutes}m
              </span>
              {timeRemaining !== null && (
                <span className={`font-bold ${
                  timeRemaining <= 0 
                    ? 'text-red-600'
                    : timeRemaining <= 60 
                      ? 'text-orange-600'
                      : 'text-green-600'
                }`}>
                  {formatTimeRemaining(timeRemaining)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Current Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {question.promptText}
          </h2>

          {/* Response Input */}
          <div className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={timeRemaining === 0}
            />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {text.length}/500 characters
              </span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || timeRemaining === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>

        {/* My Previous Responses */}
        {myResponses.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Responses ({myResponses.length})
            </h3>
            
            <div className="space-y-3">
              {myResponses.map((response) => (
                <div key={response._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  {editingResponseId === response._id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-800 mb-2">{response.bodyText}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {new Date(response.createdAt).toLocaleString()}
                        </span>
                        {response.canEdit && (
                          <button
                            onClick={() => handleEditResponse(response)}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}