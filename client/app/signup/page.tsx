"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

const ROLES = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "Data Engineer",
  "ML Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "System Design",
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(name, email, password, role);
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left panel ── */}
      <aside className="auth-left">
        <Link href="/" className="auth-logo">
          <div className="auth-logo-icon">IR</div>
          Interview Ramp
        </Link>

        <div className="auth-left-body">
          <h2 className="auth-left-title">
            Your FAANG offer starts here
          </h2>
          <p className="auth-left-sub">
            Set up your account in 30 seconds and get matched with your first mock interview partner today.
          </p>

          {/* Feature checklist */}
          <ul className="auth-checklist">
            {[
              "Unlimited peer mock interviews",
              "LeetCode-style collaborative coding editor",
              "AI-driven rubric-aligned feedback",
              "System design & behavioral sessions",
              "Progress tracking & analytics",
            ].map((f) => (
              <li key={f} className="auth-checklist-item">
                <span className="auth-check-icon">✓</span>
                {f}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="auth-quote">
            <p className="auth-quote-text">
              &ldquo;I wasn&apos;t nervous on the day of my interview at all. Interview Ramp made the real thing feel like just another practice session.&rdquo;
            </p>
            <div className="auth-quote-author">
              <div className="auth-quote-avatar" style={{ background: "#059669" }}>YA</div>
              <div>
                <div className="auth-quote-name">Yinka A.</div>
                <div className="auth-quote-role">Data Scientist, Meta</div>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </aside>

      {/* ── Right panel (form) ── */}
      <main className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Create your account</h1>
            <p className="auth-form-sub">
              Already have an account?{" "}
              <Link href="/login" className="auth-link">Log in</Link>
            </p>
          </div>

          {/* OAuth */}
          <button className="auth-oauth-btn" type="button" id="signup-google">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.131 17.64 11.862 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or sign up with email</span>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                type="text"
                className="auth-input"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-role">I&apos;m practicing for</label>
              <select
                id="signup-role"
                className="auth-input auth-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                <option value="" disabled>Select a role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                className="auth-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              id="signup-submit"
              type="submit"
              className={`auth-submit-btn${loading ? " auth-submit-btn--loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Create account →"
              )}
            </button>
          </form>

          <p className="auth-terms">
            By creating an account you agree to our{" "}
            <a href="#" className="auth-link">Terms of Service</a> and{" "}
            <a href="#" className="auth-link">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
