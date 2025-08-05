// tiny helper around fetch that always sends
// ↳ JSON + Bearer access_token (if present)
import { useAuth } from "../context/AuthContext";

export async function fetchJson<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  // Get the access_token instead of id_token
  const { accessToken, idToken } = useAuth.getState();
  
  // Use access_token for API calls, fallback to id_token if needed
  const token = idToken || accessToken;
  
  // Debug logging
  console.log(`🔍 Making request to ${path}`);
  console.log(`🎫 Token present: ${!!token}`);
  console.log(`📏 Token length: ${token?.length || 0}`);
  console.log(`🔐 Token type: ${accessToken ? 'access_token' : idToken ? 'id_token' : 'none'}`);
  if (token) {
    console.log(`🔑 Token preview: ${token.substring(0, 50)}...`);
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {}),
  };

  console.log(`📨 Headers being sent:`, headers);
  
  try {
    console.log(`🚀 Starting fetch to: ${import.meta.env.VITE_API_BASE + path}`);
    
    const res = await fetch(import.meta.env.VITE_API_BASE + path, {
      ...opts,
      headers,
    });

    console.log(`📡 Response status: ${res.status}`);
    console.log(`📡 Response ok: ${res.ok}`);
    console.log(`📡 Response headers:`, Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const txt = await res.text();
      console.error(`❌ Request failed. Status: ${res.status}, Response: ${txt}`);
      throw new Error(`${opts.method ?? "GET"} ${path} failed (${res.status}): ${txt}`);
    }

    // Check if response is empty (204)
    if (res.status === 204) {
      console.log(`✅ Empty response (204)`);
      return undefined as T;
    }

    // Try to parse JSON
    const responseText = await res.text();
    console.log(`📄 Raw response text:`, responseText);
    
    if (!responseText) {
      console.log(`✅ Empty response body`);
      return undefined as T;
    }

    try {
      const jsonData = JSON.parse(responseText);
      console.log(`✅ Parsed JSON:`, jsonData);
      return jsonData;
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON:`, parseError);
      console.error(`❌ Response was:`, responseText);
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }

  } catch (fetchError) {
    console.error(`❌ Fetch error:`, fetchError);
    throw fetchError;
  }
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

export const createSession = (title: string, orgId: string) => {
  const payload = { title, orgId };
  console.log("📤 Creating session with payload:", payload);
  
  return fetchJson<SessionDTO>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/* discussion helpers */

export interface QuestionDTO {
  _id: string;
  order: number;
  promptText: string;
  isActive: boolean;
}

export const listQuestions = (sessionId: string) => {
  console.log("📋 listQuestions called with sessionId:", sessionId);
  return fetchJson<QuestionDTO[]>(`/api/sessions/${sessionId}/questions`);
};

export const addQuestion = (sessionId: string, q: Partial<QuestionDTO>) => {
  console.log("➕ addQuestion called:", { sessionId, question: q });
  return fetchJson<QuestionDTO>(`/api/sessions/${sessionId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(q),
  });
};

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

export const updateSessionStatus = (sessionId: string, status: string) =>
  fetchJson(`/api/sessions/${sessionId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const getActiveQuestion = (sessionId: string) =>
  fetchJson<QuestionDTO | null>(`/api/sessions/${sessionId}/active-question`);