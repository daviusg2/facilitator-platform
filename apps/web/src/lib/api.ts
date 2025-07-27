const API_BASE = "http://localhost:4000";


function getIdToken(): string | null {
  return localStorage.getItem("id_token");
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const idToken = localStorage.getItem("id_token") || "";
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: idToken ? `Bearer ${idToken}` : "",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export interface Session {
  _id: string;
  title: string;
  status: string;
  moduleType: string;
  orgId: string;
  facilitatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  _id: string;
  sessionId: string;
  order: number;
  promptText: string;
  isActive: boolean;
}

export interface Response {
  _id: string;
  questionId: string;
  bodyText: string;
  createdAt: string;
}

export async function listSessions() {
  return fetchJson(`/api/sessions`);
}

export function createSession(title: string) {
  return fetchJson(`/api/sessions`, {
    method: "POST",
    body: JSON.stringify({ title }),
  }) as Promise<Session>;
}

export function listQuestions(sessionId: string) {
  return fetchJson(`/api/sessions/${sessionId}/questions`) as Promise<Question[]>;
}

export function addQuestion(sessionId: string, data: { order: number; promptText: string }) {
  return fetchJson(`/api/sessions/${sessionId}/questions`, {
    method: "POST",
    body: JSON.stringify(data),
  }) as Promise<Question>;
}

export function updateQuestion(id: string, patch: Partial<Question>) {
  return fetchJson(`/api/questions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }) as Promise<Question>;
}

export function activateQuestion(id: string) {
  return fetchJson(`/api/questions/${id}/activate`, { method: "PATCH" }) as Promise<Question>;
}

export function submitResponse(questionId: string, bodyText: string) {
  return fetchJson(`/api/questions/${questionId}/responses`, {
    method: "POST",
    body: JSON.stringify({ bodyText }),
  }) as Promise<Response>;
}
