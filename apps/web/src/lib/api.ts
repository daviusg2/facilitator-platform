// apps/web/src/lib/api.ts
// Centralised API helpers for the Facilitator Platform web app.

import { getTokens } from "./auth";

// ------------------------------------------------------------------
// Config
// ------------------------------------------------------------------

// TODO: move to env var when deploying (VITE_API_URL)
export const API = "http://localhost:4000";

// Attach Authorization header when logged in
function authHeader(): Record<string, string> {
  const t = getTokens();
  return t?.id_token ? { Authorization: `Bearer ${t.id_token}` } : {};
}

// Generic fetch wrapper (JSON in / JSON out)
async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      ...authHeader(),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${options.method || "GET"} ${url} failed (${res.status}): ${text}`
    );
  }
  return res.json() as Promise<T>;
}

// ------------------------------------------------------------------
// Types (minimal; extend as needed)
// ------------------------------------------------------------------
export interface Session {
  _id: string;
  orgId: string;
  facilitatorId: string;
  title: string;
  moduleType: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  _id: string;
  sessionId: string;
  order: number;
  promptText: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResponseDoc {
  _id: string;
  questionId: string;
  participantId: string;
  bodyText: string;
  createdAt: string;
}

// ------------------------------------------------------------------
// Sessions
// ------------------------------------------------------------------

export async function listSessions(orgId: string): Promise<Session[]> {
  return fetchJson<Session[]>(`${API}/api/sessions?orgId=${orgId}`);
}

export async function createSession(title: string): Promise<Session> {
  return fetchJson<Session>(`${API}/api/sessions`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}


// ------------------------------------------------------------------
// Questions
// ------------------------------------------------------------------

export async function listQuestions(sessionId: string): Promise<Question[]> {
  return fetchJson<Question[]>(`${API}/api/sessions/${sessionId}/questions`);
}

export async function addQuestion(
  sessionId: string,
  payload: { order: number; promptText: string }
): Promise<Question> {
  return fetchJson<Question>(`${API}/api/sessions/${sessionId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Toggle "live" state for a question.
 * Calls the flat route we added: PATCH /api/questions/:id/activate
 */
export async function updateQuestion(
  questionId: string,
  body: { isActive: boolean }
): Promise<Question> {
  return fetchJson<Question>(`${API}/api/questions/${questionId}/activate`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------------
// Responses
// ------------------------------------------------------------------

export async function submitResponse(
  questionId: string,
  bodyText: string,
  participantId = "anon"
): Promise<ResponseDoc> {
  return fetchJson<ResponseDoc>(`${API}/api/questions/${questionId}/responses`, {
    method: "POST",
    body: JSON.stringify({ participantId, bodyText }),
  });
}

// ------------------------------------------------------------------
// Convenience helpers
// ------------------------------------------------------------------

/**
 * Fetch all questions for a session and return the first active one.
 * (You can switch to a dedicated /?isActive=true route on the API later.)
 */
export async function getActiveQuestion(
  sessionId: string
): Promise<Question | null> {
  const qs = await listQuestions(sessionId);
  return qs.find((q) => q.isActive) ?? null;
}
