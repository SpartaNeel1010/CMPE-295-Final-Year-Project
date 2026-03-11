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

// ── Auth with Clerk ───────────────────────────────────────────────────────────

// When calling the backend API, be sure to fetch the Clerk session token
// using `await getToken()` from `@clerk/nextjs` (either inside a hook or server action)
// and pass it in the `Authorization` header:
//
// const token = await getToken();
// const data = await request<MyData>("/api/my-endpoint", {
//   headers: {
//     Authorization: `Bearer ${token}`
//   }
// });
