"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {

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
      <main className="auth-right" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <SignUp routing="hash" fallbackRedirectUrl="/dashboard" signInUrl="/login" />
      </main>
    </div>
  );
}
