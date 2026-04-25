"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/schedule",  label: "Schedule"   },
  { href: "/sessions",  label: "My Sessions"},
  { href: "/progress",  label: "Progress"   },
];

export default function ScheduleNavbar({ activePath }: { activePath?: string } = {}) {
  const { user } = useUser();

  // Build a 1–2 char fallback from the user's name or email
  const initials = (() => {
    if (!user) return "?";
    const name = user.fullName ?? user.firstName ?? "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    // fall back to first char of primary email
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    return email[0]?.toUpperCase() ?? "?";
  })();

  const photoUrl = user?.imageUrl ?? null;

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
          title={user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={user?.fullName ?? "User avatar"}
              width={34}
              height={34}
              className="sched-avatar-img"
              referrerPolicy="no-referrer"
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </nav>
  );
}
