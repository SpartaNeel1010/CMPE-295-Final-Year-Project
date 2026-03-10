/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: { env: Record<string, string | undefined> };
const BASE_URL: string =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:4000";

export type ApiError = {
  detail: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const err: ApiError = await res.json();
      message = err.detail ?? message;
    } catch {
      // keep the fallback message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role }),
  });
}

// ── Token helpers ─────────────────────────────────────────────────────────────

export function saveToken(token: string): void {
  localStorage.setItem("ir_token", token);
}

export function getToken(): string | null {
  return localStorage.getItem("ir_token");
}

export function clearToken(): void {
  localStorage.removeItem("ir_token");
}
