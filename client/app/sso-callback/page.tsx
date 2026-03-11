"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * This page handles the OAuth redirect from Clerk after Google sign-in/sign-up.
 * Clerk automatically completes the flow and redirects to redirectUrlComplete
 * (set to /dashboard in both login and signup pages).
 */
export default function SSOCallback() {
  return (
    <div className="auth-shell" style={{ placeItems: "center", display: "grid", minHeight: "100vh" }}>
      <div style={{ textAlign: "center", color: "var(--muted)" }}>
        <div className="auth-spinner" style={{ width: 32, height: 32, margin: "0 auto 1rem", borderWidth: 3 }} />
        <p>Completing sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
