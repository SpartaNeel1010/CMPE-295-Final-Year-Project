"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { authedRequest } from "@/lib/api";

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcoX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IcoClock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoUser = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IcoLink = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);
const IcoCode = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IcoChat = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionInvite {
  invite_code: string;
  invite_link: string;
  invitee_email: string;
  status: string;
  expires_at: string;
}

interface SessionDetail {
  id: number;
  track: string;
  mode: string;
  difficulty: string | null;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  session_link: string;
  created_at: string;
  host_user_id: string;
  guest_user_id: string | null;
  host_name: string | null;
  guest_name: string | null;
  host_email: string | null;
  guest_email: string | null;
  invite: SessionInvite | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUS_COLOR: Record<string, string> = {
  pending:   "var(--primary-light)",
  matched:   "#22c55e",
  active:    "#3b82f6",
  completed: "var(--muted)",
  cancelled: "#ef4444",
};

// ── Detail row ────────────────────────────────────────────────────────────────

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)", marginTop: "0.05rem", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "0.8rem", color: "var(--muted)", width: "90px", flexShrink: 0, paddingTop: "0.05rem" }}>{label}</span>
      <span style={{ fontSize: "0.86rem", fontWeight: 500, flex: 1 }}>{children}</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function SessionDetailModal({
  sessionId,
  onClose,
}: {
  sessionId: number;
  onClose: () => void;
}) {
  const { getToken } = useAuth();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState<"link" | "invite" | null>(null);

  useEffect(() => {
    setLoading(true);
    authedRequest<SessionDetail>(`/api/sessions/${sessionId}`, getToken)
      .then(data => setSession(data))
      .catch(err  => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const copyText = useCallback((text: string, which: "link" | "invite") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-detail-title"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: "480px" }}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="session-detail-title">Session Details</h2>
            <p className="modal-subtitle">
              {session ? `#${session.id} · ${session.track === "dsa" ? "DSA" : "Behavioral"}` : "Loading…"}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: "0.5rem 1.75rem 1.25rem" }}>

          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--muted)" }}>
              <span className="slots-spinner" aria-hidden="true" style={{ display: "inline-block", marginRight: "0.5rem" }} />
              Loading session…
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "#ef4444", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {session && !loading && (
            <>
              {/* Status pill */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.3rem 0.75rem", borderRadius: "999px",
                    fontSize: "0.78rem", fontWeight: 600,
                    background: `${STATUS_COLOR[session.status]}22`,
                    color: STATUS_COLOR[session.status],
                    border: `1px solid ${STATUS_COLOR[session.status]}44`,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[session.status], display: "inline-block" }} />
                  {capitalize(session.status)}
                </span>
                <span className={`session-badge ${session.track}`}>
                  {session.track === "dsa" ? "DSA" : "Behavioral"}
                </span>
                <span className={`session-badge ${session.mode}`}>
                  {capitalize(session.mode)}
                </span>
                {session.difficulty && (
                  <span className="session-badge" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>
                    {capitalize(session.difficulty)}
                  </span>
                )}
              </div>

              {/* Detail rows */}
              <div style={{ marginTop: "0.5rem" }}>

                <Row icon={<IcoCalendar />} label="Date">
                  {formatDate(session.scheduled_date)}
                </Row>

                <Row icon={<IcoClock />} label="Time">
                  {session.scheduled_time}
                </Row>

                <Row icon={session.track === "dsa" ? <IcoCode /> : <IcoChat />} label="Track">
                  {session.track === "dsa" ? "Data Structures & Algorithms" : "Behavioral"}
                  {session.difficulty && <span style={{ color: "var(--muted)", fontWeight: 400 }}> · {capitalize(session.difficulty)}</span>}
                </Row>

                <Row icon={<IcoUser />} label="Host">
                  {session.host_name ?? session.host_user_id}
                  {session.host_email && (
                    <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.78rem" }}> · {session.host_email}</span>
                  )}
                </Row>

                <Row icon={<IcoUser />} label="Partner">
                  {session.guest_name
                    ? <>
                        {session.guest_name}
                        {session.guest_email && (
                          <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "0.78rem" }}> · {session.guest_email}</span>
                        )}
                      </>
                    : <span style={{ color: "var(--muted)", fontStyle: "italic", fontWeight: 400 }}>
                        {session.status === "pending" ? "Waiting for a match…" : "—"}
                      </span>
                  }
                </Row>

                {/* Session link */}
                <Row icon={<IcoLink />} label="Session ID">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <code style={{ fontSize: "0.75rem", color: "var(--muted)", wordBreak: "break-all" }}>
                      {session.session_link}
                    </code>
                    <button
                      className={`invite-copy-btn ${copied === "link" ? "copied" : ""}`}
                      style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}
                      onClick={() => copyText(session.session_link, "link")}
                    >
                      {copied === "link" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </Row>

                {/* Invite link — friend sessions only */}
                {session.invite && (
                  <Row icon={<IcoLink />} label="Invite link">
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--muted)", wordBreak: "break-all" }}>
                          {session.invite.invite_link}
                        </span>
                        <button
                          className={`invite-copy-btn ${copied === "invite" ? "copied" : ""}`}
                          style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}
                          onClick={() => copyText(session.invite!.invite_link, "invite")}
                        >
                          {copied === "invite" ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        Sent to {session.invite.invitee_email}
                        {" · "}
                        <span style={{ color: session.invite.status === "accepted" ? "#22c55e" : "var(--muted)" }}>
                          {capitalize(session.invite.status)}
                        </span>
                      </span>
                    </div>
                  </Row>
                )}

                {/* Created at */}
                <div style={{ paddingTop: "0.7rem", fontSize: "0.74rem", color: "var(--muted)" }}>
                  Scheduled on {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-modal-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
