"use client";

import Link from "next/link";

export default function ScheduleNavbar() {
  return (
    <nav className="sched-navbar" role="navigation" aria-label="App navigation">
      {/* Left: logo + nav links */}
      <div className="sched-nav-left">
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon" aria-hidden="true">IR</div>
          Interview Ramp
        </Link>
        <div className="sched-nav-links" role="list">
          <Link href="/dashboard" className="sched-nav-link" role="listitem">Dashboard</Link>
          <Link href="/schedule" className="sched-nav-link active" role="listitem" aria-current="page">
            Schedule
          </Link>
          <Link href="/sessions" className="sched-nav-link" role="listitem">My Sessions</Link>
          <Link href="/progress" className="sched-nav-link" role="listitem">Progress</Link>
        </div>
      </div>

      {/* Right: help + avatar */}
      <div className="sched-nav-right">
        <a href="/help" className="sched-help-link">Help &amp; FAQ</a>
        <div
          className="sched-avatar"
          role="button"
          tabIndex={0}
          aria-label="User account menu"
          title="Account"
        >
          VM
        </div>
      </div>
    </nav>
  );
}
