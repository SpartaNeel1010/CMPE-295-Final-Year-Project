"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScheduleNavbar from "@/components/schedule/ScheduleNavbar";
import { authedRequest } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: number;
  track: string;
  mode: string;
  difficulty: string | null;
  status: string;
  scheduled_date: string;
  scheduled_time: string;
  session_link: string;
  partner_name: string | null;
  host_user_id: string;
  guest_user_id: string | null;
  question1_slug: string | null;
  question2_slug: string | null;
  started_at: string | null;
  created_at: string;
  host_joined_lobby: boolean;
  guest_joined_lobby: boolean;
}

interface FeedbackData {
  rating_coding: number;
  rating_explaining: number;
  rating_navigating: number;
  rating_followups: number;
  rating_communication: number;
  rating_problem_solving: number;
  comments: string | null;
  created_at: string;
}

type FilterTab = "All" | "Upcoming" | "Completed" | "Expired";

// ── Constants ─────────────────────────────────────────────────────────────────

const FEEDBACK_CATEGORIES = [
  { key: "rating_coding"          as keyof FeedbackData, label: "Coding the Solution"    },
  { key: "rating_explaining"      as keyof FeedbackData, label: "Explaining the Solution" },
  { key: "rating_navigating"      as keyof FeedbackData, label: "Navigating to Solution"  },
  { key: "rating_followups"       as keyof FeedbackData, label: "Asking Follow-ups"       },
  { key: "rating_communication"   as keyof FeedbackData, label: "Communication"           },
  { key: "rating_problem_solving" as keyof FeedbackData, label: "Problem-Solving"         },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; bar: string }> = {
  pending:   { label: "Waiting for Match", color: "#a78bfa", bg: "#1e1a2e", border: "#4c1d95",  bar: "#6366f1" },
  matched:   { label: "Matched",           color: "#4ade80", bg: "#0d2b1e", border: "#166534",  bar: "#22c55e" },
  active:    { label: "In Progress",       color: "#60a5fa", bg: "#0d1f2e", border: "#1e40af",  bar: "#3b82f6" },
  completed: { label: "Completed",         color: "#94a3b8", bg: "#1a1d27", border: "#2e3448",  bar: "#6366f1" },
  cancelled: { label: "Cancelled",         color: "#f87171", bg: "#2d0e0e", border: "#7f1d1d",  bar: "#ef4444" },
  expired:   { label: "Expired",           color: "#f87171", bg: "#2d0e0e", border: "#7f1d1d",  bar: "#ef4444" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function slugToTitle(slug: string | null) {
  if (!slug) return null;
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function avgRating(fb: FeedbackData): number {
  const vals = FEEDBACK_CATEGORIES.map(c => fb[c.key] as number).filter(Boolean);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stars({ value, size = "0.95rem" }: { value: number; size?: string }) {
  return (
    <span style={{ letterSpacing: "-1px", fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= value ? "#f59e0b" : "#2e3448" }}>★</span>
      ))}
    </span>
  );
}

function Badge({ children, color, bg, border }: { children: React.ReactNode; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: "999px",
      fontSize: "0.7rem", fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
    }}>
      {children}
    </span>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "0.85rem 0" }} />;
}

function TimelineRow({ dot, label, value, muted }: { dot: string; label: string; value: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: dot, flexShrink: 0, marginTop: "0.3rem",
      }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginRight: "0.4rem" }}>{label}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 600, color: muted ? "var(--muted)" : "var(--foreground)" }}>{value}</span>
      </div>
    </div>
  );
}

function RoundRow({ round, meRole, partnerName, partnerRole, question }: {
  round: number; meRole: string; partnerName: string; partnerRole: string; question: string | null;
}) {
  const isInterviewee = meRole === "Interviewee";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.65rem",
      padding: "0.55rem 0.75rem",
      background: "var(--background)", borderRadius: "8px",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        fontSize: "0.65rem", fontWeight: 800, color: "#6b7280",
        background: "#1a1d27", padding: "2px 7px", borderRadius: "999px",
        flexShrink: 0,
      }}>
        R{round}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span style={{
            fontSize: "0.68rem", fontWeight: 700,
            color: isInterviewee ? "#38bdf8" : "#c084fc",
            background: isInterviewee ? "#0d1f2b" : "#1a0d2b",
            border: `1px solid ${isInterviewee ? "#0369a1" : "#7c3aed"}`,
            padding: "1px 7px", borderRadius: "999px",
          }}>You – {meRole}</span>
          <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>vs</span>
          <span style={{
            fontSize: "0.68rem", fontWeight: 700,
            color: isInterviewee ? "#c084fc" : "#38bdf8",
            background: isInterviewee ? "#1a0d2b" : "#0d1f2b",
            border: `1px solid ${isInterviewee ? "#7c3aed" : "#0369a1"}`,
            padding: "1px 7px", borderRadius: "999px",
          }}>{partnerName} – {partnerRole}</span>
        </div>
        {question && (
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
            Problem: <span style={{ color: "var(--primary-light)", fontWeight: 600 }}>{question}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function FeedbackSection({ feedback }: { feedback: FeedbackData | null | undefined }) {
  if (feedback === undefined) {
    return (
      <p style={{ fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic" }}>
        Loading feedback…
      </p>
    );
  }
  if (feedback === null) {
    return (
      <div style={{
        padding: "0.7rem 0.9rem", borderRadius: "8px",
        background: "var(--background)", border: "1px solid var(--border)",
        fontSize: "0.76rem", color: "var(--muted)", fontStyle: "italic",
      }}>
        Your partner has not submitted feedback yet.
      </div>
    );
  }

  const avg = avgRating(feedback);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {/* Avg score pill */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.1rem" }}>
        <Stars value={Math.round(avg)} size="1rem" />
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f59e0b" }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>overall avg</span>
        <span style={{ fontSize: "0.68rem", color: "var(--muted)", marginLeft: "auto" }}>
          {new Date(feedback.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Category grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem 1rem" }}>
        {FEEDBACK_CATEGORIES.map(cat => (
          <div key={cat.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.71rem", color: "var(--muted)", flex: 1, minWidth: 0 }}>{cat.label}</span>
            <Stars value={feedback[cat.key] as number} size="0.8rem" />
          </div>
        ))}
      </div>

      {/* Comments */}
      {feedback.comments && (
        <div style={{
          marginTop: "0.25rem",
          padding: "0.6rem 0.8rem",
          background: "var(--background)", border: "1px solid var(--border)",
          borderRadius: "8px",
          borderLeft: "3px solid #6366f1",
        }}>
          <p style={{ fontSize: "0.78rem", color: "var(--foreground)", lineHeight: 1.65, margin: 0 }}>
            &ldquo;{feedback.comments}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  userId,
  feedback,
  expanded,
  onToggle,
  onCancel,
  onReschedule,
}: {
  session: SessionItem;
  userId: string | null | undefined;
  feedback: FeedbackData | null | undefined;
  expanded: boolean;
  onToggle: () => void;
  onCancel: (id: number) => void;
  onReschedule: (id: number) => void;
}) {
  const router = useRouter();
  const isHost      = session.host_user_id === userId;
  const partnerName = session.partner_name ?? "Partner";
  const meta        = STATUS_META[session.status] ?? STATUS_META.pending;
  const isCompleted = session.status === "completed";
  const isUpcoming  = ["pending", "matched", "active"].includes(session.status);
  const canJoin     = session.status === "matched" || session.status === "active";

  // Round roles: Round 1 host=interviewee, Round 2 host=interviewer
  const r1MyRole      = isHost ? "Interviewee" : "Interviewer";
  const r1PartnerRole = isHost ? "Interviewer"  : "Interviewee";
  const r2MyRole      = isHost ? "Interviewer"  : "Interviewee";
  const r2PartnerRole = isHost ? "Interviewee"  : "Interviewer";

  const q1 = slugToTitle(session.question1_slug);
  const q2 = slugToTitle(session.question2_slug);

  const durationMins = session.started_at
    ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
    : null;

  return (
    <div style={{
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}
    className="session-card"
    >
      {/* Status bar */}
      <div style={{ height: 3, background: meta.bar }} />

      {/* Card header */}
      <div style={{ padding: "1rem 1.25rem 0.85rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>

          {/* Left: date + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
              <Badge color={meta.color} bg={meta.bg} border={meta.border}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, display: "inline-block", marginRight: 5 }} />
                {meta.label}
              </Badge>
              <Badge
                color={session.track === "dsa" ? "#38bdf8" : "#c084fc"}
                bg={session.track === "dsa" ? "#0d1f2b" : "#1a0d2b"}
                border={session.track === "dsa" ? "#0369a1" : "#7c3aed"}
              >
                {session.track === "dsa" ? "DSA" : "Behavioral"}
              </Badge>
              <Badge
                color="#94a3b8" bg="#1a1d27" border="#2e3448"
              >
                {session.mode === "peer" ? "Peer Match" : "Friend"}
              </Badge>
              {session.difficulty && (
                <Badge color="#a78bfa" bg="#1e1a2e" border="#4c1d95">
                  {session.difficulty.charAt(0).toUpperCase() + session.difficulty.slice(1)}
                </Badge>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                {formatDate(session.scheduled_date)}
              </span>
              <span style={{ fontSize: "0.84rem", color: "var(--muted)", fontWeight: 500 }}>
                at {session.scheduled_time}
              </span>
            </div>

            <div style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: "var(--muted)" }}>
              Partner: <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{partnerName}</span>
              {isCompleted && feedback && (
                <span style={{ marginLeft: "0.75rem" }}>
                  <Stars value={Math.round(avgRating(feedback))} size="0.8rem" />
                  <span style={{ fontSize: "0.72rem", color: "#f59e0b", marginLeft: "0.25rem", fontWeight: 600 }}>
                    {avgRating(feedback).toFixed(1)}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
            {canJoin && (
              <button
                onClick={() => router.push(`/lobby/${session.session_link}`)}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "7px",
                  background: "#0d2b1e", color: "#4ade80",
                  border: "1px solid #166534", fontSize: "0.78rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Join Session
              </button>
            )}
            {isUpcoming && !canJoin && (
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  onClick={() => onReschedule(session.id)}
                  style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Reschedule
                </button>
                <button
                  onClick={() => onCancel(session.id)}
                  style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", border: "1px solid #7f1d1d", background: "#2d0e0e", color: "#f87171", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onToggle}
              style={{
                padding: "0.3rem 0.75rem", borderRadius: "6px",
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--muted)", fontSize: "0.72rem", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem",
              }}
            >
              {expanded ? "Hide Details ↑" : "View Details ↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "0 1.25rem 1.1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>

          {/* Timeline */}
          <div style={{ marginBottom: "1rem" }}>
            <SectionLabel>Event Timeline</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.5rem", paddingLeft: "0.25rem" }}>
              <TimelineRow
                dot="#6366f1" label="Scheduled"
                value={formatDatetime(session.created_at)}
              />
              {(session.host_joined_lobby || session.guest_joined_lobby) && (
                <TimelineRow
                  dot="#3b82f6" label="Lobby joined"
                  value={session.host_joined_lobby && session.guest_joined_lobby ? "Both participants" : "One participant"}
                />
              )}
              {session.started_at && (
                <TimelineRow
                  dot="#22c55e" label="Session started"
                  value={formatDatetime(session.started_at)}
                />
              )}
              {isCompleted && session.started_at && (
                <TimelineRow
                  dot="#94a3b8" label="Completed"
                  value={`~60 min session · ${durationMins ? `${durationMins} min elapsed` : "full duration"}`}
                />
              )}
              {(session.status === "expired" || session.status === "cancelled") && (
                <TimelineRow
                  dot="#ef4444" label={session.status === "expired" ? "Expired" : "Cancelled"}
                  value="Session did not take place"
                  muted
                />
              )}
            </div>
          </div>

          <Divider />

          {/* Round roles */}
          <div style={{ marginBottom: "1rem" }}>
            <SectionLabel>Interview Rounds</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.5rem" }}>
              <RoundRow
                round={1}
                meRole={r1MyRole}
                partnerName={partnerName}
                partnerRole={r1PartnerRole}
                question={q1}
              />
              <RoundRow
                round={2}
                meRole={r2MyRole}
                partnerName={partnerName}
                partnerRole={r2PartnerRole}
                question={q2}
              />
            </div>
          </div>

          {/* Feedback — completed sessions only */}
          {isCompleted && (
            <>
              <Divider />
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <SectionLabel>Feedback from {partnerName}</SectionLabel>
                  {feedback && (
                    <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                      You rated them too — visible to your partner
                    </span>
                  )}
                </div>
                <FeedbackSection feedback={feedback} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "0.67rem", fontWeight: 800,
      letterSpacing: "0.08em", textTransform: "uppercase",
      color: "var(--primary-light)",
    }}>
      {children}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export default function SessionsClient() {
  const { getToken, userId } = useAuth();

  const [sessions,     setSessions]     = useState<SessionItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [feedbackMap,  setFeedbackMap]  = useState<Record<number, FeedbackData | null | undefined>>({});
  const [expandedIds,  setExpandedIds]  = useState<Set<number>>(new Set());
  const [filterTab,    setFilterTab]    = useState<FilterTab>("All");

  const loadSessions = useCallback(() => {
    setLoading(true);
    authedRequest<SessionItem[]>("/api/sessions", getToken)
      .then(data => {
        setSessions(data);
        // Prefetch feedback for all completed sessions
        const completed = data.filter(s => s.status === "completed");
        if (completed.length > 0) {
          setFeedbackMap(prev => {
            const next = { ...prev };
            completed.forEach(s => { if (!(s.id in next)) next[s.id] = undefined; });
            return next;
          });
          Promise.all(
            completed.map(s =>
              authedRequest<{ received: FeedbackData | null }>(`/api/sessions/${s.id}/feedback`, getToken)
                .then(r => ({ id: s.id, fb: r.received }))
                .catch(() => ({ id: s.id, fb: null }))
            )
          ).then(results => {
            setFeedbackMap(prev => {
              const next = { ...prev };
              results.forEach(({ id, fb }) => { next[id] = fb; });
              return next;
            });
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCancel = (id: number) => {
    if (!confirm("Cancel this session?")) return;
    authedRequest(`/api/sessions/${id}`, getToken, { method: "DELETE" })
      .then(() => setSessions(prev => prev.map(s => s.id === id ? { ...s, status: "cancelled" } : s)))
      .catch(err => alert(`Failed to cancel: ${(err as Error).message}`));
  };

  const handleReschedule = (id: number) => {
    const date = prompt("New date (YYYY-MM-DD):");
    if (!date) return;
    const time = prompt("New time (e.g. 2:00 PM):");
    if (!time) return;
    authedRequest(`/api/sessions/${id}/reschedule`, getToken, {
      method: "PATCH",
      body: JSON.stringify({ date, time }),
    })
      .then(() => loadSessions())
      .catch(err => alert(`Failed to reschedule: ${(err as Error).message}`));
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = sessions.filter(s => {
    if (filterTab === "Upcoming")  return ["pending", "matched", "active"].includes(s.status);
    if (filterTab === "Completed") return s.status === "completed";
    if (filterTab === "Expired")   return s.status === "expired" || s.status === "cancelled";
    return true;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalCompleted = sessions.filter(s => s.status === "completed").length;
  const totalUpcoming  = sessions.filter(s => ["pending", "matched", "active"].includes(s.status)).length;
  const allFeedback    = Object.values(feedbackMap).filter(Boolean) as FeedbackData[];
  const overallAvg     = allFeedback.length
    ? (allFeedback.reduce((sum, fb) => sum + avgRating(fb), 0) / allFeedback.length).toFixed(1)
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <ScheduleNavbar activePath="/sessions" />

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.03em", marginBottom: "0.35rem" }}>
            My Sessions
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", lineHeight: 1.6 }}>
            A complete record of your mock interviews — rounds, questions, timelines, and peer feedback.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.75rem" }}>
          {[
            { label: "Total Sessions", value: sessions.length },
            { label: "Completed",      value: totalCompleted },
            { label: "Upcoming",       value: totalUpcoming },
            { label: "Avg Rating",     value: overallAvg, star: true },
          ].map(({ label, value, star }) => (
            <div key={label} style={{
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "0.9rem 1.1rem",
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1, marginBottom: "0.3rem" }}>
                {star && typeof value === "string" && value !== "—" ? (
                  <span style={{ color: "#f59e0b" }}>★ {value}</span>
                ) : value}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
          {(["All", "Upcoming", "Completed", "Expired"] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                padding: "0.6rem 1.1rem",
                fontSize: "0.8rem", fontWeight: 600,
                color: filterTab === tab ? "var(--primary-light)" : "var(--muted)",
                background: "transparent", border: "none", cursor: "pointer",
                borderBottom: filterTab === tab ? "2px solid var(--primary-light)" : "2px solid transparent",
                marginBottom: "-1px", transition: "color 0.15s",
              }}
            >
              {tab}
              <span style={{
                marginLeft: "0.4rem",
                fontSize: "0.66rem", fontWeight: 700,
                color: filterTab === tab ? "var(--primary-light)" : "#2e3448",
                background: filterTab === tab ? "#1e1a2e" : "#1a1d27",
                padding: "1px 6px", borderRadius: "999px",
              }}>
                {tab === "All"       ? sessions.length :
                 tab === "Upcoming"  ? totalUpcoming :
                 tab === "Completed" ? totalCompleted :
                 sessions.filter(s => s.status === "expired" || s.status === "cancelled").length}
              </span>
            </button>
          ))}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
            <Link
              href="/schedule"
              style={{
                padding: "0.45rem 1rem", borderRadius: "7px",
                background: "var(--primary)", color: "white",
                fontSize: "0.78rem", fontWeight: 700, textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
              }}
            >
              + Schedule New
            </Link>
          </div>
        </div>

        {/* ── Session list ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--muted)" }}>
            <div className="sessions-spinner" />
            <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>Loading your sessions…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "4rem 2rem",
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "12px",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", opacity: 0.4 }}>
              {filterTab === "Upcoming" ? "📅" : filterTab === "Completed" ? "✅" : "📭"}
            </div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.4rem" }}>
              No {filterTab.toLowerCase()} sessions
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
              {filterTab === "Upcoming"
                ? "You have no upcoming sessions scheduled."
                : filterTab === "Completed"
                ? "Complete your first mock interview to see it here."
                : "Nothing to show for this filter."}
            </p>
            <Link
              href="/schedule"
              style={{
                padding: "0.55rem 1.4rem", borderRadius: "8px",
                background: "var(--primary)", color: "white",
                fontSize: "0.85rem", fontWeight: 700, textDecoration: "none",
              }}
            >
              Schedule a Session
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filtered.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                userId={userId}
                feedback={feedbackMap[session.id]}
                expanded={expandedIds.has(session.id)}
                onToggle={() => toggleExpand(session.id)}
                onCancel={handleCancel}
                onReschedule={handleReschedule}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        .session-card:hover { border-color: #2e3448 !important; }
        .sessions-spinner {
          display: inline-block;
          width: 28px; height: 28px;
          border: 3px solid var(--border);
          border-top-color: var(--primary-light);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
