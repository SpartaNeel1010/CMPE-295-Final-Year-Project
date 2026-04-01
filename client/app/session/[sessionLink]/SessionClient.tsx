"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { authedRequest } from "@/lib/api";
import Link from "next/link";

interface SessionDetail {
  session_link: string;
  status: string;
  host_name: string | null;
  guest_name: string | null;
  scheduled_date: string;
  scheduled_time: string;
  track: string;
  is_host: boolean;
}

interface SessionClientProps {
  sessionLink: string;
}

export default function SessionClient({ sessionLink }: SessionClientProps) {
  const { getToken } = useAuth();
  const [session, setSession]   = useState<SessionDetail | null>(null);
  const [error,   setError]     = useState<string | null>(null);

  useEffect(() => {
    authedRequest<SessionDetail>(
      `/api/sessions/link/${sessionLink}/lobby-status`,
      getToken,
    )
      .then(setSession)
      .catch(err => setError(err.message));
  }, [sessionLink, getToken]);

  if (error) {
    return (
      <div style={styles.page}>
        <p style={{ color: "var(--muted)" }}>{error}</p>
        <Link href="/schedule" style={styles.backBtn}>Back to schedule</Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={styles.spinner} aria-label="Loading…" />
      </div>
    );
  }

  const trackLabel = session.track === "dsa" ? "DSA" : "Behavioral";
  const myName     = session.is_host ? session.host_name  : session.guest_name;
  const theirName  = session.is_host ? session.guest_name : session.host_name;

  return (
    <div style={styles.page}>
      <nav className="navbar">
        <Link href="/schedule" className="navbar-logo">
          <span className="navbar-logo-icon">IR</span>
          InterviewRamp
        </Link>
      </nav>

      <main style={styles.main}>
        <div style={styles.badge}>{trackLabel} · Live Session</div>
        <h1 style={styles.heading}>Session in Progress</h1>
        <p style={styles.sub}>
          {myName} vs {theirName ?? "Partner"} · {session.scheduled_time}
        </p>

        <div style={styles.placeholderBox}>
          <span style={{ fontSize: "3rem" }}>🚧</span>
          <p style={{ marginTop: "1rem", color: "var(--muted)", fontSize: "0.95rem" }}>
            The coding environment is coming soon.
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
            Session ID: <code style={{ color: "var(--accent)", fontFamily: "monospace" }}>{sessionLink}</code>
          </p>
        </div>

        <Link href="/schedule" style={styles.backBtn}>Back to schedule</Link>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "var(--background)",
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center",
  },
  badge: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--primary-light)",
    marginBottom: "0.75rem",
  },
  heading: {
    fontSize: "2.2rem",
    fontWeight: 800,
    color: "var(--foreground)",
    letterSpacing: "-0.03em",
    marginBottom: "0.5rem",
  },
  sub: {
    fontSize: "0.95rem",
    color: "var(--muted)",
    marginBottom: "2.5rem",
  },
  placeholderBox: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "16px",
    padding: "3rem 4rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: "2rem",
  },
  backBtn: {
    padding: "0.6rem 1.5rem",
    borderRadius: "8px",
    background: "var(--primary)",
    color: "white",
    fontWeight: 600,
    fontSize: "0.9rem",
    textDecoration: "none",
    display: "inline-block",
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid var(--border)",
    borderTopColor: "var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
