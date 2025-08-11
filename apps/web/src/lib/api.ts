// apps/web/src/lib/api.ts (Enhanced version)
import { useAuth } from "../context/AuthContext";

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export class ApiException extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
  }
}

export async function fetchJson<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const { accessToken, idToken } = useAuth.getState();
  const token = idToken || accessToken;
  
  console.log(`🔍 Making request to ${path}`);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {}),
  };
  
  try {
    console.log(`🚀 Starting fetch to: ${import.meta.env.VITE_API_BASE + path}`);
    
    const res = await fetch(import.meta.env.VITE_API_BASE + path, {
      ...opts,
      headers,
    });

    console.log(`📡 Response status: ${res.status}`);

    if (!res.ok) {
      let errorMessage = `Request failed with status ${res.status}`;
      let errorCode: string | undefined;

      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorCode = errorData.code;
      } catch {
        // If response isn't JSON, use status text
        errorMessage = res.statusText || errorMessage;
      }

      throw new ApiException(errorMessage, res.status, errorCode);
    }

    // Handle empty responses
    if (res.status === 204) {
      console.log(`✅ Empty response (204)`);
      return undefined as T;
    }

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
      throw new ApiException('Invalid response format', res.status);
    }

  } catch (error) {
    console.error(`❌ Fetch error:`, error);
    
    if (error instanceof ApiException) {
      throw error;
    }
    
    // Network or other errors
    throw new ApiException(
      'Network error. Please check your connection and try again.',
      0
    );
  }
}

// Enhanced API functions with better error handling
export interface SessionDTO {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
}

export const listSessions = async (orgId: string): Promise<SessionDTO[]> => {
  try {
    return await fetchJson<SessionDTO[]>(`/api/sessions?orgId=${orgId}`);
  } catch (error) {
    console.error('Failed to list sessions:', error);
    throw error;
  }
};

export const createSession = async (title: string, orgId: string): Promise<SessionDTO> => {
  try {
    const payload = { title, orgId };
    console.log("📤 Creating session with payload:", payload);
    
    return await fetchJson<SessionDTO>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
};

export interface QuestionDTO {
  _id: string;
  sessionId: string;
  order: number;
  promptText: string;
  isActive: boolean;
  
  // Timer fields
  timerDurationMinutes?: number;
  timerStartedAt?: string;
  timerExpiresAt?: string;
  timerExtendedMinutes?: number;
  
  // Duplication fields
  originalQuestionId?: string;
  duplicatedFromSession?: string;
  
  // Metadata
  createdBy?: string;
  notes?: string;
  
  // Virtual fields (computed by backend)
  isTimerExpired?: boolean;
  remainingTimeMinutes?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
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


// Add this to your apps/web/src/lib/api.ts
export const updateQuestion = async (questionId: string, updates: Partial<QuestionDTO>): Promise<QuestionDTO> => {
  try {
    return await fetchJson<QuestionDTO>(`/api/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error('Failed to update question:', error);
    throw error;
  }
};

export const deleteQuestion = async (questionId: string): Promise<void> => {
  try {
    return await fetchJson(`/api/questions/${questionId}`, {
      method: "DELETE",
    });
  } catch (error) {
    console.error('Failed to delete question:', error);
    throw error;
  }
};

export const toggleQuestion = (questionId: string, active: { isActive: boolean }) =>
  fetchJson<QuestionDTO>(`/api/questions/${questionId}/activate`, {
    method: "PATCH",
    body: JSON.stringify(active),
  });

  
export const submitResponse = async (questionId: string, bodyText: string): Promise<void> => {
  try {
    return await fetchJson(`/api/questions/${questionId}/responses`, {
      method: "POST",
      body: JSON.stringify({ bodyText }),
    });
  } catch (error) {
    console.error('Failed to submit response:', error);
    throw error;
  }
};

export const updateSessionStatus = async (sessionId: string, status: string): Promise<void> => {
  try {
    return await fetchJson(`/api/sessions/${sessionId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error('Failed to update session status:', error);
    throw error;
  }
};

export const getActiveQuestion = async (sessionId: string): Promise<QuestionDTO | null> => {
  try {
    return await fetchJson<QuestionDTO | null>(`/api/sessions/${sessionId}/active-question`);
  } catch (error) {
    console.error('Failed to get active question:', error);
    throw error;
  }
};
// Update a response (for moderation actions)
export const updateResponse = (responseId: string, updates: Partial<ResponseDTO>) => {
  console.log("🔄 updateResponse called:", { responseId, updates });
  return fetchJson<ResponseDTO>(`/api/responses/${responseId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

// Delete a response
export const deleteResponse = (responseId: string) => {
  console.log("🗑️ deleteResponse called:", responseId);
  return fetchJson(`/api/responses/${responseId}`, {
    method: "DELETE",
  });
};

// Bulk update responses
export const bulkUpdateResponses = (responseIds: string[], updates: Partial<ResponseDTO>) => {
  console.log("📦 bulkUpdateResponses called:", { responseIds, updates });
  return fetchJson<ResponseDTO[]>(`/api/responses/bulk`, {
    method: "PATCH",
    body: JSON.stringify({
      responseIds,
      updates
    }),
  });
};

// Bulk delete responses
export const bulkDeleteResponses = (responseIds: string[]) => {
  console.log("🗑️ bulkDeleteResponses called:", responseIds);
  return fetchJson(`/api/responses/bulk`, {
    method: "DELETE",
    body: JSON.stringify({ responseIds }),
  });
};

// Add these to your existing API types (apps/web/src/lib/api.ts)

export interface QuestionDTO {
  _id: string;
  sessionId: string;
  order: number;
  promptText: string;
  isActive: boolean;
  
  // Timer fields
  timerDurationMinutes?: number;
  timerStartedAt?: string;
  timerExpiresAt?: string;
  timerExtendedMinutes?: number;
  
  // Duplication fields
  originalQuestionId?: string;
  duplicatedFromSession?: string;
  
  // Metadata
  createdBy?: string;
  notes?: string;
  
  // Virtual fields (computed by backend)
  isTimerExpired?: boolean;
  remainingTimeMinutes?: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface TimerStatus {
  hasTimer: boolean;
  isActive: boolean;
  durationMinutes?: number;
  startedAt?: string;
  expiresAt?: string;
  extendedMinutes: number;
  isExpired: boolean;
  remainingMinutes?: number;
}

export interface DuplicableQuestion {
  _id: string;
  promptText: string;
  order: number;
  timerDurationMinutes?: number;
  notes?: string;
  createdAt: string;
  originalQuestionId?: string;
  duplicatedFromSession?: string;
  isDuplicate: boolean;
  canDuplicate: boolean;
}

export interface RecentSession {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
}

// API function signatures to add:

export const extendQuestionTimer = (questionId: string, additionalMinutes: number) =>
  fetchJson(`/api/questions/${questionId}/extend-timer`, {
    method: "PATCH",
    body: JSON.stringify({ additionalMinutes }),
  });

export const duplicateQuestion = (questionId: string, targetSessionId: string, order?: number) =>
  fetchJson(`/api/questions/${questionId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ targetSessionId, order }),
  });

export const bulkDuplicateQuestions = (targetSessionId: string, sourceSessionId: string, questionIds: string[], startOrder?: number) =>
  fetchJson(`/api/sessions/${targetSessionId}/questions/bulk-duplicate`, {
    method: "POST",
    body: JSON.stringify({ sourceSessionId, questionIds, startOrder }),
  });

export const getQuestionTimerStatus = (questionId: string) =>
  fetchJson<TimerStatus>(`/api/questions/${questionId}/timer-status`);

export const getDuplicableQuestions = (sessionId: string) =>
  fetchJson<DuplicableQuestion[]>(`/api/sessions/${sessionId}/questions/duplicable`);

export const getRecentSessions = (limit = 10) =>
  fetchJson<RecentSession[]>(`/api/sessions/my-recent?limit=${limit}`);