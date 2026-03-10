"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, saveToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await login(email, password);
      saveToken(token);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
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
            Land your dream job with real practice
          </h2>
          <p className="auth-left-sub">
            Join thousands of engineers who use Interview Ramp to sharpen their skills, match with peers, and ace technical interviews.
          </p>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-number">10k+</span>
              <span className="auth-stat-label">Mock interviews</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-number">94%</span>
              <span className="auth-stat-label">Offer rate</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-number">500+</span>
              <span className="auth-stat-label">Problems</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="auth-quote">
            <p className="auth-quote-text">
              &ldquo;Interview Ramp is the reason I got into Google. The peer-to-peer sessions felt exactly like the real thing.&rdquo;
            </p>
            <div className="auth-quote-author">
              <div className="auth-quote-avatar" style={{ background: "#0891b2" }}>FP</div>
              <div>
                <div className="auth-quote-name">Filipe P.</div>
                <div className="auth-quote-role">Software Engineer, Google</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative glow */}
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
      </aside>

      {/* ── Right panel (form) ── */}
      <main className="auth-right">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <h1 className="auth-form-title">Welcome back</h1>
            <p className="auth-form-sub">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="auth-link">Sign up free</Link>
            </p>
          </div>

          {/* OAuth */}
          <button className="auth-oauth-btn" type="button" id="login-google">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.131 17.64 11.862 17.64 9.2z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
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
              <label className="auth-label" htmlFor="login-password">
                Password
                <Link href="/forgot-password" className="auth-label-link">Forgot password?</Link>
              </label>
              <input
                id="login-password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className={`auth-submit-btn${loading ? " auth-submit-btn--loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <p className="auth-terms">
            By continuing, you agree to our{" "}
            <a href="#" className="auth-link">Terms</a> and{" "}
            <a href="#" className="auth-link">Privacy Policy</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
