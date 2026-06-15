const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("clientpulse_token");
}

export function setSession(data) {
  localStorage.setItem("clientpulse_token", data.access_token);
  localStorage.setItem("clientpulse_user", JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem("clientpulse_token");
  localStorage.removeItem("clientpulse_user");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("clientpulse_user"));
  } catch {
    return null;
  }
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("clientpulse:unauthorized"));
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Request failed");
  }
  return response.json();
}

export { API_URL };
