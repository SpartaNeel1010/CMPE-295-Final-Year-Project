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

// ── Auth with Clerk ───────────────────────────────────────────────────────────

/**
 * Make an authenticated request by injecting the Clerk session token.
 * Pass `getToken` from `useAuth()` in your component.
 */
export async function authedRequest<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  return request<T>(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
