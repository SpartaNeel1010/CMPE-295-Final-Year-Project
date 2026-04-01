"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authedRequest } from "@/lib/api";
import Link from "next/link";

interface LobbyStatus {
  session_link: string;
  status: string;
  host_name: string | null;
  guest_name: string | null;
  host_joined: boolean;
  guest_joined: boolean;
  both_joined: boolean;
  scheduled_date: string;
  scheduled_time: string;
  track: string;
  is_host: boolean;
}

interface LobbyClientProps {
  sessionLink: string;
}

export default function LobbyClient({ sessionLink }: LobbyClientProps) {
  const { getToken } = useAuth();
  const router = useRouter();
  const [lobbyStatus, setLobbyStatus] = useState<LobbyStatus | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [joined, setJoined]           = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Join the lobby once on mount
  useEffect(() => {
    authedRequest<{ message: string }>(
      `/api/sessions/link/${sessionLink}/join-lobby`,
      getToken,
      { method: "POST" },
    )
      .then(() => setJoined(true))
      .catch(err => setError(err.message));
  }, [sessionLink, getToken]);

  // Poll lobby status every 2 seconds after joining
  useEffect(() => {
    if (!joined) return;

    const poll = () => {
      authedRequest<LobbyStatus>(
        `/api/sessions/link/${sessionLink}/lobby-status`,
        getToken,
      )
        .then(data => {
          setLobbyStatus(data);
          if (data.both_joined || data.status === "active") {
            clearInterval(pollRef.current!);
            // Brief pause so the user sees both checkmarks before redirect
            setTimeout(() => router.push(`/session/${sessionLink}`), 1200);
          }
        })
        .catch(err => {
          clearInterval(pollRef.current!);
          setError(err.message);
        });
    };

    poll(); // immediate first poll
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current!);
  }, [joined, sessionLink, getToken, router]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="lobby-page">
        <div className="lobby-card">
          <div className="lobby-error-icon" aria-hidden="true">⚠</div>
          <h2 className="lobby-title">Unable to join lobby</h2>
          <p className="lobby-subtitle">{error}</p>
          <Link href="/schedule" className="lobby-back-btn">Back to schedule</Link>
        </div>
      </div>
    );
  }

  if (!lobbyStatus) {
    return (
      <div className="lobby-page">
        <div className="lobby-card">
          <div className="lobby-spinner" aria-label="Connecting…" />
          <p className="lobby-subtitle" style={{ marginTop: "1.5rem" }}>Connecting to lobby…</p>
        </div>
      </div>
    );
  }

  const myName   = lobbyStatus.is_host ? lobbyStatus.host_name  : lobbyStatus.guest_name;
  const theirName = lobbyStatus.is_host ? lobbyStatus.guest_name : lobbyStatus.host_name;
  const iJoined    = lobbyStatus.is_host ? lobbyStatus.host_joined  : lobbyStatus.guest_joined;
  const theyJoined = lobbyStatus.is_host ? lobbyStatus.guest_joined : lobbyStatus.host_joined;

  const trackLabel = lobbyStatus.track === "dsa" ? "DSA" : "Behavioral";

  return (
    <div className="lobby-page">
      {/* Navbar strip */}
      <nav className="navbar" aria-label="Navigation">
        <Link href="/schedule" className="navbar-logo">
          <span className="navbar-logo-icon" aria-hidden="true">IR</span>
          InterviewRamp
        </Link>
      </nav>

      <div className="lobby-outer">
        {/* Session info */}
        <p className="lobby-meta">
          {trackLabel} · {lobbyStatus.scheduled_time}
          {lobbyStatus.both_joined && (
            <span style={{ color: "#4ade80", marginLeft: "0.75rem", fontWeight: 700 }}>Both joined — starting…</span>
          )}
        </p>

        <h1 className="lobby-title">
          {lobbyStatus.both_joined ? "Session starting!" : "Waiting for your partner…"}
        </h1>
        <p className="lobby-subtitle">
          {lobbyStatus.both_joined
            ? "Redirecting you to the coding session."
            : "The session will begin automatically once both participants are here."}
        </p>

        {/* Participant cards */}
        <div className="lobby-participants">
          <ParticipantCard
            name={myName ?? "You"}
            label="You"
            joined={iJoined}
          />
          <div className="lobby-vs" aria-hidden="true">vs</div>
          <ParticipantCard
            name={theirName ?? "Your partner"}
            label="Partner"
            joined={theyJoined}
          />
        </div>

        {/* Session ID */}
        <p className="lobby-session-id">
          Session ID: <code>{sessionLink}</code>
        </p>
      </div>

      <style>{lobbyStyles}</style>
    </div>
  );
}

function ParticipantCard({ name, label, joined }: { name: string; label: string; joined: boolean }) {
  return (
    <div className={`lobby-participant ${joined ? "joined" : "waiting"}`}>
      <div className="lobby-avatar" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="lobby-participant-name">{name}</div>
      <div className="lobby-participant-label">{label}</div>
      <div className={`lobby-status-dot ${joined ? "joined" : "waiting"}`}>
        {joined ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <span className="lobby-pulse" aria-hidden="true" />
        )}
        <span style={{ marginLeft: "0.35rem" }}>{joined ? "Joined" : "Waiting…"}</span>
      </div>
    </div>
  );
}

const lobbyStyles = `
  .lobby-page {
    min-height: 100vh;
    background: var(--background);
    display: flex;
    flex-direction: column;
  }
  .lobby-outer {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
  }
  .lobby-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    text-align: center;
  }
  .lobby-meta {
    font-size: 0.82rem;
    color: var(--muted);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 1rem;
  }
  .lobby-title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--foreground);
    letter-spacing: -0.03em;
    margin-bottom: 0.6rem;
  }
  .lobby-subtitle {
    font-size: 0.95rem;
    color: var(--muted);
    max-width: 420px;
    line-height: 1.6;
    margin-bottom: 2.5rem;
  }
  .lobby-participants {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .lobby-vs {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--muted);
  }
  .lobby-participant {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.75rem 2rem;
    min-width: 180px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    transition: border-color 0.2s ease;
  }
  .lobby-participant.joined {
    border-color: #166534;
    background: #0d2b1e;
  }
  .lobby-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    font-size: 1.4rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.4rem;
  }
  .lobby-participant-name {
    font-size: 1rem;
    font-weight: 700;
    color: var(--foreground);
  }
  .lobby-participant-label {
    font-size: 0.75rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .lobby-status-dot {
    display: flex;
    align-items: center;
    font-size: 0.82rem;
    margin-top: 0.35rem;
  }
  .lobby-status-dot.joined { color: #4ade80; }
  .lobby-status-dot.waiting { color: var(--muted); }
  .lobby-pulse {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
    animation: lobby-blink 1.2s ease-in-out infinite;
  }
  @keyframes lobby-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
  .lobby-spinner {
    width: 44px;
    height: 44px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: lobby-spin 0.8s linear infinite;
  }
  @keyframes lobby-spin {
    to { transform: rotate(360deg); }
  }
  .lobby-session-id {
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 1rem;
  }
  .lobby-session-id code {
    font-family: monospace;
    color: var(--accent);
  }
  .lobby-error-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  .lobby-back-btn {
    margin-top: 1.5rem;
    padding: 0.6rem 1.5rem;
    border-radius: 8px;
    background: var(--primary);
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    text-decoration: none;
    display: inline-block;
    transition: background 0.15s ease;
  }
  .lobby-back-btn:hover { background: var(--primary-dark); }
`;
