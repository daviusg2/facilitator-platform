import { useEffect, useState } from "react";
import React from "react"; // Add this import
import { Link } from "react-router-dom";
import { useAuthActions, useAuth } from "../context/AuthContext";
import { listSessions, createSession, updateSessionStatus } from "../lib/api";
import type { SessionDTO } from "../lib/api";
import { useOrgStore } from "../store/useOrgStore";

// Move TokenDebugger outside as a separate component
function TokenDebugger() {
  const { accessToken, idToken } = useAuth();
  
  const decodeToken = (token: string | undefined, tokenType: string) => {
    if (!token) return null;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      const isExpired = decoded.exp && decoded.exp < now;
      
      console.log(`🔍 ${tokenType} Token Details:`, {
        ...decoded,
        isExpired,
        expiresIn: decoded.exp ? `${(decoded.exp - now) / 60} minutes` : 'N/A',
        issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toLocaleString() : 'N/A',
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toLocaleString() : 'N/A'
      });
      
      return { ...decoded, isExpired };
    } catch (e) {
      console.error(`Error decoding ${tokenType} token:`, e);
      return null;
    }
  };
  
  React.useEffect(() => {
    console.log('🔐 === TOKEN DEBUGGING ===');
    decodeToken(accessToken, 'ACCESS');
    decodeToken(idToken, 'ID');
    console.log('🔐 === END TOKEN DEBUGGING ===');
  }, [accessToken, idToken]);
  
  return null;
}

export default function DashboardPage() {
  const { signOut } = useAuthActions();
  const { idToken } = useAuth(); // Add this to check auth status
  const { orgId } = useOrgStore();
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only make API calls if user is authenticated
    if (!idToken) {
      setLoading(false);
      return;
    }

    listSessions(orgId)
      .then(setSessions)
      .catch((e) => console.error("listSessions error", e))
      .finally(() => setLoading(false));
  }, [orgId, idToken]); // Add idToken as dependency

  const handleCreate = async () => {
    if (!title.trim() || !idToken) return; // Check auth before creating
    
    try {
      const s = await createSession(title.trim(), orgId);
      setSessions((p) => [...p, s]);
      setTitle("");
    } catch (e) {
      console.error("createSession error", e);
    }
  };

  const handleStatusUpdate = async (sessionId: string, newStatus: string) => {
    try {
      await updateSessionStatus(sessionId, newStatus);
      // Update local state
      setSessions(sessions.map(s => 
        s._id === sessionId ? { ...s, status: newStatus } : s
      ));
    } catch (e) {
      console.error("updateSessionStatus error", e);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <TokenDebugger /> {/* Add debugger here */}
        <p>Loading...</p>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!idToken) {
    const { signIn } = useAuthActions();
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <TokenDebugger /> {/* Add debugger here */}
        <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
        <p className="text-gray-600 mb-4">You need to sign in to access the dashboard.</p>
        <button 
          onClick={signIn}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Sign In with AWS Cognito
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <TokenDebugger /> {/* Add debugger here - this is the main place it will run */}
      
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Facilitator Dashboard</h1>
        <button onClick={signOut} className="text-sm text-blue-600">
          Sign out
        </button>
      </header>

      <section className="space-y-3">
        <h2 className="font-semibold">Create session</h2>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Session title"
            className="border rounded px-3 py-2 flex-1"
          />
          <button
            onClick={handleCreate}
            className="bg-green-600 text-white rounded px-4"
          >
            Add
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No sessions yet.</p>
        ) : (
          <ul className="border rounded divide-y">
            {sessions.map((s) => (
              <li key={s._id} className="p-3">
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
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      >
                        Go Live
                      </button>
                    )}
                    {s.status === 'live' && (
                      <button
                        onClick={() => handleStatusUpdate(s._id, 'archived')}
                        className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                      >
                        Archive
                      </button>
                    )}
                    {s.status === 'archived' && (
                      <button
                        onClick={() => handleStatusUpdate(s._id, 'draft')}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


