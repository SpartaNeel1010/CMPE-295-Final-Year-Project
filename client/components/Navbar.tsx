"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="navbar">
      {/* ── Logo ── */}
      <Link href="/" className="navbar-logo">
        <div className="navbar-logo-icon">IR</div>
        Interview Ramp
      </Link>

      {/* ── Auth actions ── */}
      <div className="navbar-actions">
        <Link href="/login" className="btn-ghost" id="nav-login">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary" id="nav-signup">
          Sign up
        </Link>
      </div>
    </nav>
  );
}
