// apps/web/src/lib/api.ts
// Clean API client used by the React app.

export type SessionDTO = {
  _id: string;
  orgId: string;
  facilitatorId: string;
  title: string;
  moduleType: "discussion";
  status: "draft" | "live" | "closed" | "DRAFT" | "LIVE" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

export type QuestionDTO = {
  _id: string;
  sessionId: string;
  order: number;
  promptText: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ResponseDTO = {
  _id: string;
  questionId: string;
  participantId?: string;
  bodyText: string;
  createdAt: string;
};

function baseUrl() {
  // Vite exposes env vars under import.meta.env
  return import.meta.env.VITE_API_BASE || "http://localhost:4000";
}

function authHeaders() {
  const token = localStorage.getItem("id_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Generic fetch wrapper that always:
 *  - prefixes API base URL
 *  - sends/accepts JSON
 *  - attaches Authorization header if present
 *  - throws descriptive error on failure
 */
async function fetchJson<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl()}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    // Try to read response text for better diagnostics
    const text = await res.text().catch(() => "");
    // Surface clear error up to caller/component
    throw new Error(
      `${init.method ?? "GET"} ${path} failed (${res.status}): ${
        text || res.statusText
      }`
    );
  }

  // 204 No Content?
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/* ------------------------ Sessions ------------------------ */

export async function listSessions(): Promise<SessionDTO[]> {
  // Backend reads orgId from the verified JWT; no query string needed.
  return fetchJson<SessionDTO[]>("/api/sessions");
}

export async function createSession(title: string): Promise<SessionDTO> {
  // IMPORTANT: body must be JSON, not a raw string → prevents "entity.parse.failed"
  return fetchJson<SessionDTO>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

/* ------------------------ Questions ------------------------ */

export async function listQuestions(
  sessionId: string
): Promise<QuestionDTO[]> {
  return fetchJson<QuestionDTO[]>(`/api/sessions/${sessionId}/questions`);
}

export async function addQuestion(
  sessionId: string,
  data: { order: number; promptText: string }
): Promise<QuestionDTO> {
  return fetchJson<QuestionDTO>(`/api/sessions/${sessionId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function activateQuestion(
  questionId: string,
  isActive: boolean
): Promise<QuestionDTO> {
  // Route implemented on the API: PATCH /api/questions/:id/activate
  return fetchJson<QuestionDTO>(`/api/questions/${questionId}/activate`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

/* ------------------------ Responses ------------------------ */

export async function submitResponse(
  questionId: string,
  bodyText: string
): Promise<ResponseDTO> {
  return fetchJson<ResponseDTO>(`/api/questions/${questionId}/responses`, {
    method: "POST",
    body: JSON.stringify({ bodyText }),
  });
}

