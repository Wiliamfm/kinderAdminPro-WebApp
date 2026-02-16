const PB_URL = import.meta.env.VITE_PB_URL || "http://127.0.0.1:8090";
const TOKEN_KEY = "pb_auth_token";
const USER_KEY = "pb_auth_user";

type AuthResponse = {
  token: string;
  record: Record<string, unknown>;
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function isAuthenticated() {
  if (!isBrowser()) return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function getCurrentUser() {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const response = await fetch(`${PB_URL}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identity: email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(String(response.status));
  }

  const payload = (await response.json()) as AuthResponse;

  localStorage.setItem(TOKEN_KEY, payload.token);
  localStorage.setItem(USER_KEY, JSON.stringify(payload.record));
}

export function logout() {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
