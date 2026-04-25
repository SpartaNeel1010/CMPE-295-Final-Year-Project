"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ScheduleNavbar from "@/components/schedule/ScheduleNavbar";
import { authedRequest } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  completed: number;
  upcoming: number;
  cancelled: number;
  overall_avg_rating: number | null;
}

interface NextSession {
  id: number;
  session_link: string;
  scheduled_date: string;
  scheduled_time: string;
  track: string;
  difficulty: string | null;
  mode: string;
  status: string;
  partner_name: string | null;
}

interface FeedbackSnippet {
  rating_coding: number;
  rating_explaining: number;
  rating_navigating: number;
  rating_followups: number;
  rating_communication: number;
  rating_problem_solving: number;
  comments: string | null;
  created_at: string;
}

interface RecentSession {
  id: number;
  session_link: string;
  scheduled_date: string;
  scheduled_time: string;
  track: string;
  difficulty: string | null;
  partner_name: string | null;
  feedback: FeedbackSnippet | null;
}

interface TrackInfo {
  total: number;
  completed: number;
  upcoming: number;
}

interface DiffInfo {
  total: number;
  completed: number;
}

interface MonthPoint {
  month: string;
  year: number;
  key: string;
  count: number;
}

interface CategoryAverages {
  coding: number | null;
  explaining: number | null;
  navigating: number | null;
  followups: number | null;
  communication: number | null;
  problem_solving: number | null;
  feedback_count: number;
}

interface DashboardData {
  stats: Stats;
  next_session: NextSession | null;
  recent_sessions: RecentSession[];
  track_breakdown: { dsa: TrackInfo; behavioral: TrackInfo };
  difficulty_breakdown: { beginner: DiffInfo; intermediate: DiffInfo; advanced: DiffInfo };
  monthly_activity: MonthPoint[];
  category_averages: CategoryAverages | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function avgFeedback(fb: FeedbackSnippet): number {
  const vals = [
    fb.rating_coding, fb.rating_explaining, fb.rating_navigating,
    fb.rating_followups, fb.rating_communication, fb.rating_problem_solving,
  ].filter(Boolean) as number[];
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function daysUntil(dateStr: string, timeStr: string): number {
  const [timePart, ampm] = timeStr.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  let hour = h;
  if (ampm === "PM" && h !== 12) hour += 12;
  if (ampm === "AM" && h === 12) hour = 0;
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d, hour, m);
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Stars({ value, size = "0.88rem" }: { value: number; size?: string }) {
  return (
    <span style={{ fontSize: size, letterSpacing: "-1px", lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ color: s <= Math.round(value) ? "#f59e0b" : "#2e3448" }}>★</span>
      ))}
    </span>
  );
}

function StatCard({
  label, value, sub, icon, accent, href,
}: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  accent?: string; href?: string;
}) {
  const inner = (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "14px", padding: "1.2rem 1.35rem",
      display: "flex", flexDirection: "column", gap: "0.75rem",
      transition: "border-color 0.18s, transform 0.18s",
      cursor: href ? "pointer" : "default",
      position: "relative", overflow: "hidden",
    }}
    className="dash-stat-card"
    >
      {/* accent glow */}
      {accent && (
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 80, height: 80, borderRadius: "50%",
          background: accent, filter: "blur(28px)", opacity: 0.25,
          pointerEvents: "none",
        }} />
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 38, height: 38, borderRadius: "10px",
          background: accent ? `${accent}22` : "var(--card-hover)",
          border: `1px solid ${accent ? `${accent}44` : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: accent ?? "var(--muted)",
        }}>
          {icon}
        </div>
        {href && (
          <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>→</span>
        )}
      </div>
      <div>
        <div style={{
          fontSize: "2rem", fontWeight: 800, color: accent ?? "var(--foreground)",
          letterSpacing: "-0.03em", lineHeight: 1,
        }}>
          {value}
        </div>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", marginTop: "0.25rem" }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: "0.15rem", opacity: 0.75 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: "none" }}>{inner}</Link>;
  return inner;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

// Mini bar chart drawn purely via CSS
function BarChart({ data }: { data: MonthPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 80 }}>
      {data.map(pt => {
        const pct = (pt.count / max) * 100;
        const isThisMonth = pt.count > 0;
        return (
          <div key={pt.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", height: "100%" }}>
            <div style={{ fontSize: "0.6rem", color: "var(--muted)", fontWeight: 600 }}>
              {pt.count > 0 ? pt.count : ""}
            </div>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%",
                height: `${Math.max(pct, pt.count > 0 ? 8 : 3)}%`,
                background: isThisMonth
                  ? "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)"
                  : "var(--border)",
                borderRadius: "4px 4px 2px 2px",
                transition: "height 0.4s ease",
                minHeight: 3,
              }} />
            </div>
            <div style={{ fontSize: "0.62rem", color: "var(--muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
              {pt.month}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Radar-style category breakdown via horizontal bars
function CategoryBar({ label, value, maxVal = 5 }: { label: string; value: number | null; maxVal?: number }) {
  const pct = value != null ? (value / maxVal) * 100 : 0;
  const color = value == null ? "var(--border)"
    : value >= 4.5 ? "#4ade80"
    : value >= 3.5 ? "#818cf8"
    : value >= 2.5 ? "#f59e0b"
    : "#f87171";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "0.74rem", color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: value != null ? color : "var(--muted)" }}>
          {value != null ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: 999,
          transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
    </div>
  );
}

// Donut arc (CSS-only)
function DonutRing({ pct, color, size = 72, stroke = 8 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

function TrackDonut({ label, info, color }: { label: string; info: TrackInfo; color: string }) {
  const pct = info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <DonutRing pct={pct} color={color} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--foreground)" }}>{label}</div>
        <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{info.completed}/{info.total} done</div>
      </div>
    </div>
  );
}

function NextSessionCard({ session, onJoin }: { session: NextSession | null; onJoin: () => void }) {
  if (!session) {
    return (
      <div style={{
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "14px", padding: "1.5rem",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "0.75rem", textAlign: "center", minHeight: 140,
      }}>
        <div style={{ fontSize: "2rem", opacity: 0.4 }}>📅</div>
        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--foreground)" }}>No upcoming sessions</div>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Schedule your next mock interview to stay sharp.</p>
        <Link href="/schedule" style={{
          padding: "0.5rem 1.2rem", borderRadius: "8px",
          background: "var(--primary)", color: "white",
          fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
        }}>
          Schedule Now
        </Link>
      </div>
    );
  }

  const days = daysUntil(session.scheduled_date, session.scheduled_time);
  const canJoin = session.status === "matched" || session.status === "active";
  const trackColor = session.track === "dsa" ? "#818cf8" : "#c084fc";
  const urgency = days <= 0 ? "#4ade80" : days <= 1 ? "#f59e0b" : "var(--foreground)";

  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "14px", overflow: "hidden",
      position: "relative",
    }}>
      {/* top accent bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${trackColor}, ${canJoin ? "#4ade80" : trackColor}88)`,
      }} />
      <div style={{ padding: "1.25rem 1.35rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            {/* Countdown pill */}
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{
                fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: urgency, background: `${urgency}15`,
                border: `1px solid ${urgency}40`,
                padding: "2px 9px", borderRadius: "999px",
              }}>
                {days <= 0 ? "Starting now!" : days === 1 ? "Tomorrow" : `In ${days} days`}
              </span>
            </div>

            <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {fmtDate(session.scheduled_date)}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.2rem" }}>
              at {session.scheduled_time}
            </div>

            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                background: session.track === "dsa" ? "#0d1f2b" : "#1a0d2b",
                color: trackColor,
                border: `1px solid ${session.track === "dsa" ? "#0369a1" : "#7c3aed"}`,
              }}>
                {session.track === "dsa" ? "DSA" : "Behavioral"}
              </span>
              {session.difficulty && (
                <span style={{
                  fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                  background: "#1e1a2e", color: "#a78bfa", border: "1px solid #4c1d95",
                }}>
                  {capitalize(session.difficulty)}
                </span>
              )}
              <span style={{
                fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                background: "#1a1d27", color: "#94a3b8", border: "1px solid #2e3448",
              }}>
                {session.mode === "peer" ? "Peer Match" : "Friend"}
              </span>
            </div>

            {session.partner_name && (
              <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.55rem" }}>
                Partner: <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{session.partner_name}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0, alignItems: "flex-end" }}>
            {canJoin ? (
              <button
                onClick={onJoin}
                style={{
                  padding: "0.5rem 1.2rem", borderRadius: "8px",
                  background: "#0d2b1e", color: "#4ade80",
                  border: "1px solid #166534", fontSize: "0.82rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem",
                  animation: "subtle-pulse 2s ease-in-out infinite",
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Join Now
              </button>
            ) : (
              <Link href="/schedule" style={{
                padding: "0.5rem 1.1rem", borderRadius: "8px",
                background: "transparent", color: "var(--primary-light)",
                border: "1px solid var(--primary)", fontSize: "0.78rem", fontWeight: 700,
                textDecoration: "none",
              }}>
                View →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentSessionRow({ session }: { session: RecentSession }) {
  const avg = session.feedback ? avgFeedback(session.feedback) : null;
  const trackColor = session.track === "dsa" ? "#818cf8" : "#c084fc";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.85rem",
      padding: "0.75rem 0",
      borderBottom: "1px solid var(--border)",
    }}
    className="dash-recent-row"
    >
      {/* track dot */}
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: trackColor, flexShrink: 0 }} />

      {/* date + partner */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)" }}>
          {fmtDate(session.scheduled_date)}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          {capitalize(session.track)} · {session.partner_name ?? "—"}
        </div>
      </div>

      {/* rating */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem", flexShrink: 0 }}>
        {avg != null ? (
          <>
            <Stars value={avg} />
            <span style={{ fontSize: "0.68rem", color: "#f59e0b", fontWeight: 700 }}>{avg.toFixed(1)}</span>
          </>
        ) : (
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>No feedback yet</span>
        )}
      </div>

      <Link href="/sessions" style={{
        fontSize: "0.72rem", color: "var(--muted)",
        textDecoration: "none", flexShrink: 0,
      }}>
        →
      </Link>
    </div>
  );
}

function TipCard({ tips }: { tips: string[] }) {
  const [idx, setIdx] = useState(0);
  const tip = tips[idx];

  useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % tips.length), 8000);
    return () => clearInterval(id);
  }, [tips.length]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1e1a2e 0%, #13161e 100%)",
      border: "1px solid #4c1d9555",
      borderRadius: "14px", padding: "1.25rem 1.35rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <span style={{ fontSize: "0.95rem" }}>💡</span>
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Tip of the moment
        </span>
      </div>
      <p style={{ fontSize: "0.82rem", color: "#c8cdd8", lineHeight: 1.65, minHeight: "2.8em" }}>
        {tip}
      </p>
      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.75rem" }}>
        {tips.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: i === idx ? "#818cf8" : "var(--border)",
            border: "none", cursor: "pointer", padding: 0,
            transition: "background 0.2s",
          }} />
        ))}
      </div>
    </div>
  );
}

// Greeting based on time of day
function greeting(name: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name.split(" ")[0]} 👋`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────────────────────────────────────

const TIPS = [
  "Schedule at least 2 sessions/week to build momentum and stay sharp.",
  "Do DSA sessions in the morning when problem-solving focus peaks.",
  "After each session, jot down one thing to improve — small gains compound fast.",
  "Use behavioral sessions to rehearse STAR-format stories out loud.",
  "As an interviewer, ask clarifying questions before diving into code.",
  "Strong candidates communicate their thought process before writing any code.",
  "Practice edge cases: empty arrays, single elements, negative numbers.",
];

const CATEGORY_LABELS: Record<string, string> = {
  coding:          "Implementing / Coding",
  explaining:      "Explaining Solutions",
  navigating:      "Navigating the Problem",
  followups:       "Asking Follow-ups",
  communication:   "Communication & Clarity",
  problem_solving: "Problem-Solving Approach",
};

export default function DashboardClient() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [data, setData]     = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    authedRequest<DashboardData>("/api/sessions/dashboard", getToken)
      .then(d => setData(d))
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const userName = user?.fullName ?? user?.firstName ?? "there";
  const photoUrl = user?.imageUrl ?? null;

  const stats = data?.stats;
  const completionRate = stats && stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      <ScheduleNavbar activePath="/dashboard" />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2.5rem 1.5rem 5rem" }}>

        {/* ── Welcome header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem",
          marginBottom: "2.5rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={userName}
                width={52} height={52}
                style={{ borderRadius: "50%", border: "2px solid var(--primary)", flexShrink: 0 }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--primary)", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontSize: "1.2rem", fontWeight: 800,
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{
                fontSize: "1.6rem", fontWeight: 800, color: "var(--foreground)",
                letterSpacing: "-0.03em", lineHeight: 1.15,
              }}>
                {greeting(userName)}
              </h1>
              <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                Here&apos;s your interview preparation overview
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <Link href="/schedule" style={{
              padding: "0.55rem 1.2rem", borderRadius: "8px",
              background: "var(--primary)", color: "white",
              fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
              display: "flex", alignItems: "center", gap: "0.35rem",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Session
            </Link>
            <Link href="/sessions" style={{
              padding: "0.55rem 1.1rem", borderRadius: "8px",
              background: "transparent", color: "var(--muted)",
              border: "1px solid var(--border)",
              fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>
              My Sessions
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: "1rem" }}>
            <div className="dash-spinner" />
            <p style={{ color: "var(--muted)", fontSize: "0.88rem" }}>Loading your dashboard…</p>
          </div>
        ) : error ? (
          <div style={{
            textAlign: "center", padding: "3rem",
            background: "var(--card)", border: "1px solid #7f1d1d",
            borderRadius: "12px", color: "#f87171",
          }}>
            <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Failed to load dashboard</p>
            <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{error}</p>
          </div>
        ) : data ? (
          <>
            {/* ── Stats row ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "1rem",
              marginBottom: "2rem",
            }}>
              <StatCard
                label="Total Sessions"
                value={data.stats.total}
                sub={`${completionRate}% completion rate`}
                accent="#818cf8"
                href="/sessions"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                }
              />
              <StatCard
                label="Completed"
                value={data.stats.completed}
                sub="mock interviews done"
                accent="#4ade80"
                href="/sessions"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                }
              />
              <StatCard
                label="Upcoming"
                value={data.stats.upcoming}
                sub="sessions scheduled"
                accent="#60a5fa"
                href="/schedule"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                }
              />
              <StatCard
                label="Avg Rating"
                value={data.stats.overall_avg_rating != null ? `★ ${data.stats.overall_avg_rating.toFixed(1)}` : "—"}
                sub={data.category_averages ? `from ${data.category_averages.feedback_count} reviews` : "No feedback yet"}
                accent="#f59e0b"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                }
              />
            </div>

            {/* ── Main grid: left wide + right narrow ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", alignItems: "start" }}>

              {/* ════ LEFT COLUMN ════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                {/* Next session */}
                <div>
                  <SectionHeader title="Next Session" />
                  <NextSessionCard
                    session={data.next_session}
                    onJoin={() => data.next_session && router.push(`/lobby/${data.next_session.session_link}`)}
                  />
                </div>

                {/* Monthly activity */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader title="Monthly Activity" />
                  <BarChart data={data.monthly_activity} />
                  <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.6rem" }}>
                    Sessions per month · last 6 months
                  </p>
                </div>

                {/* Performance radar */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader
                    title="Performance Breakdown"
                    action={
                      data.category_averages ? (
                        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                          Based on {data.category_averages.feedback_count} peer review{data.category_averages.feedback_count !== 1 ? "s" : ""}
                        </span>
                      ) : undefined
                    }
                  />
                  {data.category_averages ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <CategoryBar
                          key={key}
                          label={label}
                          value={data.category_averages![key as keyof CategoryAverages] as number | null}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: "center", padding: "2rem 1rem",
                      color: "var(--muted)", fontSize: "0.82rem",
                    }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem", opacity: 0.4 }}>📊</div>
                      Complete sessions to see your performance breakdown.
                    </div>
                  )}
                </div>

                {/* Recent sessions */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader
                    title="Recent Sessions"
                    action={
                      <Link href="/sessions" style={{ fontSize: "0.76rem", color: "var(--primary-light)", textDecoration: "none", fontWeight: 600 }}>
                        View all →
                      </Link>
                    }
                  />
                  {data.recent_sessions.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)", fontSize: "0.82rem" }}>
                      No completed sessions yet.
                    </div>
                  ) : (
                    <div>
                      {data.recent_sessions.map(s => (
                        <RecentSessionRow key={s.id} session={s} />
                      ))}
                      <div style={{ height: 1 }} /> {/* remove bottom border of last row */}
                    </div>
                  )}
                </div>
              </div>

              {/* ════ RIGHT SIDEBAR ════ */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                {/* Track breakdown donuts */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader title="Track Progress" />
                  <div style={{ display: "flex", justifyContent: "space-around", paddingTop: "0.5rem" }}>
                    <TrackDonut label="DSA" info={data.track_breakdown.dsa} color="#818cf8" />
                    <TrackDonut label="Behavioral" info={data.track_breakdown.behavioral} color="#c084fc" />
                  </div>
                </div>

                {/* Difficulty breakdown */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader title="Difficulty Breakdown" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {(["beginner", "intermediate", "advanced"] as const).map(diff => {
                      const info = data.difficulty_breakdown[diff];
                      const pct = info.total > 0 ? (info.completed / info.total) * 100 : 0;
                      const colors: Record<string, string> = {
                        beginner: "#4ade80",
                        intermediate: "#f59e0b",
                        advanced: "#f87171",
                      };
                      return (
                        <div key={diff}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--foreground)" }}>
                              {capitalize(diff)}
                            </span>
                            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                              {info.completed}/{info.total}
                            </span>
                          </div>
                          <div style={{ height: 6, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: `linear-gradient(90deg, ${colors[diff]}88, ${colors[diff]})`,
                              borderRadius: 999,
                              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions */}
                <div style={{
                  background: "var(--card)", border: "1px solid var(--border)",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                }}>
                  <SectionHeader title="Quick Actions" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {[
                      { label: "📅  Schedule a Peer Session", href: "/schedule" },
                      { label: "📨  Invite a Friend",         href: "/schedule" },
                      { label: "📋  View My Sessions",        href: "/sessions" },
                      { label: "⚙️  Account Settings",      href: "/settings"  },
                    ].map(({ label, href }) => (
                      <Link key={href + label} href={href} style={{
                        display: "block",
                        padding: "0.55rem 0.85rem",
                        borderRadius: "8px", fontSize: "0.82rem", fontWeight: 500,
                        color: "var(--foreground)",
                        background: "var(--card-hover)",
                        border: "1px solid var(--border)",
                        textDecoration: "none",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      className="dash-quick-action"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Tip card */}
                <TipCard tips={TIPS} />

                {/* Streak / motivation card */}
                <div style={{
                  background: "linear-gradient(135deg, #0d2b1e 0%, #13161e 100%)",
                  border: "1px solid #166534",
                  borderRadius: "14px", padding: "1.25rem 1.35rem",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>🎯</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#4ade80", marginBottom: "0.3rem" }}>
                    {data.stats.completed === 0
                      ? "Start your journey"
                      : data.stats.completed < 5
                      ? "You're getting started!"
                      : data.stats.completed < 10
                      ? "Building momentum!"
                      : data.stats.completed < 20
                      ? "Interview-ready!"
                      : "Elite interviewee 🏆"}
                  </div>
                  <p style={{ fontSize: "0.76rem", color: "#6ee7b7", lineHeight: 1.55 }}>
                    {data.stats.completed === 0
                      ? "Complete your first mock interview to see your progress."
                      : `${data.stats.completed} session${data.stats.completed !== 1 ? "s" : ""} completed. Keep going!`}
                  </p>
                </div>

              </div>
            </div>
          </>
        ) : null}
      </main>

      <style>{`
        .dash-stat-card:hover {
          border-color: #2e3448 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(0,0,0,0.3);
        }
        .dash-recent-row:last-child { border-bottom: none !important; }
        .dash-quick-action:hover {
          border-color: var(--primary) !important;
          background: #1e1b3a !important;
          color: var(--primary-light) !important;
        }
        .dash-spinner {
          display: inline-block;
          width: 36px; height: 36px;
          border: 3px solid var(--border);
          border-top-color: var(--primary-light);
          border-radius: 50%;
          animation: dash-spin 0.7s linear infinite;
        }
        @keyframes dash-spin { to { transform: rotate(360deg); } }
        @keyframes subtle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
          50% { box-shadow: 0 0 0 4px rgba(74,222,128,0.2); }
        }
        @media (max-width: 800px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
