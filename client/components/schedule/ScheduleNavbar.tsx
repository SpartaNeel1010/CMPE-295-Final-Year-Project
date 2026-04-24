"use client";

import Link from "next/link";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule",  label: "Schedule"   },
  { href: "/sessions",  label: "My Sessions"},
  { href: "/progress",  label: "Progress"   },
];

export default function ScheduleNavbar({ activePath }: { activePath?: string } = {}) {
  return (
    <nav className="sched-navbar" role="navigation" aria-label="App navigation">
      {/* Left: logo + nav links */}
      <div className="sched-nav-left">
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon" aria-hidden="true">IR</div>
          Interview Ramp
        </Link>
        <div className="sched-nav-links" role="list">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`sched-nav-link${activePath === href ? " active" : ""}`}
              role="listitem"
              aria-current={activePath === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
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
