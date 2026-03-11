"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {

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
      <main className="auth-right" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <SignIn routing="hash" fallbackRedirectUrl="/dashboard" signUpUrl="/signup" />
      </main>
    </div>
  );
}
