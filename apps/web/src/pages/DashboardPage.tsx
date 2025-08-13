import { useEffect, useState } from "react";
import React from "react";
import { Link } from "react-router-dom";
import { useAuthActions, useAuth } from "../context/AuthContext";
import { listSessions, createSession, updateSessionStatus, ApiException } from "../lib/api";
import type { SessionDTO } from "../lib/api";
import { useOrgStore } from "../store/useOrgStore";
import { useToast } from "../components/Toast";

// Enhanced loading hook for this component
const useLoading = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: {
    showSuccessToast?: boolean;
    successMessage?: string;
    showErrorToast?: boolean;
    onError?: (error: Error) => void;
    onSuccess?: (result: R) => void;
  } = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const toast = useToast();

  const {
    showSuccessToast = false,
    successMessage = 'Operation completed successfully',
    showErrorToast = true,
    onError,
    onSuccess
  } = options;

  const execute = async (...args: T): Promise<R | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await asyncFunction(...args);

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      onSuccess?.(result);
      return result;

    } catch (err) {
      const error = err as Error;
      setError(error);

      if (showErrorToast) {
        if (error instanceof ApiException) {
          toast.error('Request Failed', error.message);
        } else {
          toast.error('Unexpected Error', error.message || 'Something went wrong');
        }
      }

      onError?.(error);
      return null;

    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const { idToken } = useAuth();
  const { orgId } = useOrgStore();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [title, setTitle] = useState("");
  const toast = useToast();

  // Loading states for different operations
  const {
    execute: loadSessions,
    isLoading: isLoadingSessions,
    error: sessionsError
  } = useLoading(listSessions, {
    showErrorToast: true,
    onSuccess: (data) => setSessions(data || [])
  });

  const {
    execute: createNewSession,
    isLoading: isCreatingSession
  } = useLoading(createSession, {
    showSuccessToast: true,
    successMessage: "Session created successfully!",
    onSuccess: (newSession) => {
      if (newSession) {
        setSessions(prev => [...prev, newSession]);
        setTitle("");
      }
    }
  });

  const {
    execute: updateStatus,
    isLoading: isUpdatingStatus
  } = useLoading(updateSessionStatus, {
    showSuccessToast: true,
    successMessage: "Session status updated!"
  });

  useEffect(() => {
    if (!idToken) return;
    
    const loadData = async () => {
      try {
        const sessions = await listSessions(orgId);
        setSessions(sessions);
      } catch (error) {
        console.error(error);
      }
    };
    
    loadData();
  }, [orgId, idToken]);

  const handleCreate = async () => {
    if (!title.trim() || !idToken) {
      toast.warning("Please enter a session title");
      return;
    }
    
    await createNewSession(title.trim(), orgId);
  };

  const handleStatusUpdate = async (sessionId: string, newStatus: string) => {
    await updateStatus(sessionId, newStatus);
    
    // Update local state optimistically
    setSessions(sessions.map(s => 
      s._id === sessionId ? { ...s, status: newStatus } : s
    ));
  };

  // Direct QR download function - no modal
  const handleQRDownload = async (session: SessionDTO) => {
    console.log("🔍 QR download starting for:", session.title);
    
    try {
      // Generate QR code URL
      const participantUrl = `${window.location.origin}/join/${session._id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(participantUrl)}&format=png&margin=20`;
      
      console.log("🔍 Generated QR URL:", qrUrl);
      
      // Create filename
      const filename = `qr-code-${session.title.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      
      // Try direct download
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log("✅ Download initiated for:", filename);
      
      // Show success message
      toast.success(`QR code downloading: ${filename}`);
      
      // Backup instruction
      setTimeout(() => {
        toast.info("If download didn't start, check your downloads folder or the new tab that opened.");
      }, 3000);
      
    } catch (error) {
      console.error("❌ QR download failed:", error);
      toast.error("QR download failed. Please try again.");
    }
  };

  // Show sign-in prompt if not authenticated
  if (!idToken) {
    const { signIn } = useAuthActions();
    return (
      <div className="max-w-3xl mx-auto p-6 text-center font-sans">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-4">You need to sign in to access the dashboard.</p>
        <button 
          onClick={signIn}
          className="btn-primary"
        >
          Sign In with AWS Cognito
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facilitator Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your sessions and engage with participants</p>
        </div>
        <button 
          onClick={signOut} 
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          Sign out
        </button>
      </header>

      {/* Create Session Section */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Create New Session</h2>
        <div className="flex gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter session name (e.g., 'Team Workshop - Strategy Planning')"
            className="input-default flex-1 text-base"
            disabled={isCreatingSession}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreatingSession || !title.trim()}
            className="bg-green-600 text-white rounded-lg px-6 py-2 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-w-[100px] font-medium"
          >
            {isCreatingSession ? 'Creating...' : 'Create'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Give your session a descriptive name that participants will recognize
        </p>
      </section>

      {/* Sessions List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Your Sessions</h2>
          {isLoadingSessions && (
            <span className="text-sm text-gray-500">Loading...</span>
          )}
        </div>

        {sessionsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Failed to load sessions. Please try refreshing the page.
          </div>
        )}

        {sessions.length === 0 && !isLoadingSessions ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No sessions yet</h3>
            <p className="text-gray-600 mb-4">Create your first session to get started with facilitation</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <div key={session._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {session.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        Created: {new Date(session.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'live' 
                          ? 'bg-green-100 text-green-800' 
                          : session.status === 'archived'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Status Update Dropdown */}
                    <select
                      value={session.status}
                      onChange={(e) => handleStatusUpdate(session._id, e.target.value)}
                      disabled={isUpdatingStatus}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                      <option value="archived">Archived</option>
                    </select>

                    {/* Direct QR Download Button */}
                    <button
                      onClick={() => handleQRDownload(session)}
                      className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      title="Download QR Code for participants"
                    >
                      📱 QR
                    </button>

                    {/* Host Session Button */}
                    <Link
                      to={`/session/${session._id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Host Session
                    </Link>
                  </div>
                </div>

                {/* Session Details */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      Session ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{session._id}</code>
                    </span>
                    <span className="text-gray-600">
                      Participant link: 
                      <code className="ml-1 bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        /join/{session._id}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/join/${session._id}`);
                          toast.success("Link copied to clipboard!");
                        }}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        title="Copy participant link"
                      >
                        📋
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Actions</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-2">📝</div>
            <h4 className="font-medium text-blue-900 mb-1">Create Questions</h4>
            <p className="text-sm text-blue-700">Add discussion prompts to your sessions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">📱</div>
            <h4 className="font-medium text-blue-900 mb-1">QR Codes</h4>
            <p className="text-sm text-blue-700">One-click download for easy sharing</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">👥</div>
            <h4 className="font-medium text-blue-900 mb-1">Invite Participants</h4>
            <p className="text-sm text-blue-700">Share session links or QR codes</p>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <h4 className="font-medium text-blue-900 mb-1">View Responses</h4>
            <p className="text-sm text-blue-700">Monitor participant engagement live</p>
          </div>
        </div>
      </section>
    </div>
  );
}