const sessionStorageKey = "retail-auth-session";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001/api";

export function getSession() {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(sessionStorageKey) || sessionStorage.getItem(sessionStorageKey);
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    if (session.expiresAt && new Date(session.expiresAt) <= new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(sessionStorageKey);
  sessionStorage.removeItem(sessionStorageKey);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, { method = "GET", body } = {}) {
  const session = getSession();

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(session?.token ? { Authorization: `${session.tokenType || "Bearer"} ${session.token}` } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired. Please sign in again.", 401, data);
  }

  if (!response.ok) {
    throw new ApiError(data.message || "Request failed.", response.status, data);
  }

  return data;
}