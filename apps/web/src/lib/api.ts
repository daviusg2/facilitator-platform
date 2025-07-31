// tiny helper around fetch that always sends
// ↳ JSON + Bearer id‑token  (if present)
import { useAuth } from "../context/AuthContext";

export async function fetchJson<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const { idToken } = useAuth.getState();   // Zustand hook‑less read

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    ...(opts.headers ?? {}),
  };

  const res = await fetch(import.meta.env.VITE_API_BASE + path, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${opts.method ?? "GET"} ${path} failed (${res.status}): ${txt}`);
  }
  // empty 204 → return void 0
  return res.status === 204 ? (undefined as T) : res.json();
}

/* ---------- higher‑level helpers ---------- */

export interface SessionDTO {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
}

export const listSessions = (orgId: string) =>
  fetchJson<SessionDTO[]>(`/api/sessions?orgId=${orgId}`);

export const createSession = (title: string, orgId: string) =>
  fetchJson<SessionDTO>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title, orgId }),
  });

/* discussion helpers */

export interface QuestionDTO {
  _id: string;
  order: number;
  promptText: string;
  isActive: boolean;
}

export const listQuestions = (sessionId: string) =>
  fetchJson<QuestionDTO[]>(`/api/sessions/${sessionId}/questions`);

export const addQuestion = (sessionId: string, q: Partial<QuestionDTO>) =>
  fetchJson<QuestionDTO>(`/api/sessions/${sessionId}/questions`, {
    method: "POST",
    body: JSON.stringify(q),
  });

export const toggleQuestion = (questionId: string, active: boolean) =>
  fetchJson<QuestionDTO>(`/api/questions/${questionId}/activate`, {
    method: "PATCH",
    body: JSON.stringify({ isActive: active }),
  });

export const submitResponse = (questionId: string, bodyText: string) =>
  fetchJson(`/api/questions/${questionId}/responses`, {
    method: "POST",
    body: JSON.stringify({ bodyText }),
  });




