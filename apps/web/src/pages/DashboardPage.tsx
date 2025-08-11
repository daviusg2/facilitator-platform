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
}, [orgId, idToken]); // ✅ No function in dependencies

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

  // Show sign-in prompt if not authenticated
  if (!idToken) {
    const { signIn } = useAuthActions();
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-4">You need to sign in to access the dashboard.</p>
        <button 
          onClick={signIn}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Sign In with AWS Cognito
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Facilitator Dashboard</h1>
        <button 
          onClick={signOut} 
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Create Session Section */}
      <section className="space-y-3">
        <h2 className="font-semibold">Create session</h2>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            className="border rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-w-[80px]"
          >
            {isCreatingSession ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </section>

      {/* Sessions Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Sessions</h2>
          {isLoadingSessions && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
              Loading...
            </div>
          )}
        </div>

        {/* Error State */}
        {sessionsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Failed to load sessions</p>
            <p className="text-sm mt-1">{sessionsError.message}</p>
            <button
              onClick={() => loadSessions(orgId)}
              className="text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded mt-2 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Sessions List */}
        {!isLoadingSessions && !sessionsError && (
          <>
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
                <p className="text-lg mb-2">No sessions yet</p>
                <p className="text-sm">Create your first session above to get started!</p>
              </div>
            ) : (
              <ul className="border rounded divide-y bg-white">
                {sessions.map((s) => (
                  <li key={s._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/session/${s._id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {s.title}
                          </Link>
                          <span className={`text-xs px-2 py-1 rounded ${
                            s.status === 'live' 
                              ? 'bg-green-100 text-green-800' 
                              : s.status === 'archived'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {s.status || 'draft'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(s.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {s.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(s._id, 'live')}
                            disabled={isUpdatingStatus}
                            className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                          >
                            {isUpdatingStatus ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              'Go Live'
                            )}
                          </button>
                        )}
                        {s.status === 'live' && (
                          <button
                            onClick={() => handleStatusUpdate(s._id, 'archived')}
                            disabled={isUpdatingStatus}
                            className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
                          >
                            {isUpdatingStatus ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              'Archive'
                            )}
                          </button>
                        )}
                        {s.status === 'archived' && (
                          <button
                            onClick={() => handleStatusUpdate(s._id, 'draft')}
                            disabled={isUpdatingStatus}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                          >
                            {isUpdatingStatus ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              'Reopen'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}