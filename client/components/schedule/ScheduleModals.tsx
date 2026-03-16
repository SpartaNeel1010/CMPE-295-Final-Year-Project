"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { authedRequest } from "@/lib/api";

// ── Inline SVG icons (18×18, stroke, currentColor) ───────────────────────────

const IconCode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMail = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconCheckCircle = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

// ── Types ────────────────────────────────────────────────────────────────────

type Track = "dsa" | "behavioral" | null;
type Difficulty = "beginner" | "intermediate" | "advanced" | null;
type SlotFilter = "all" | "morning" | "afternoon" | "evening";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Slot types & defaults ─────────────────────────────────────────────────────

type Slot = { label: string; period: SlotFilter; available: boolean };

// These mirror the backend SLOTS_BY_TRACK constants exactly.
// All slots start as available; the API overlays real availability on date select.
const DEFAULT_SLOTS: Record<string, Slot[]> = {
  dsa: [
    { label: "9:00 AM",  period: "morning",   available: true },
    { label: "11:00 AM", period: "morning",   available: true },
    { label: "1:00 PM",  period: "afternoon", available: true },
    { label: "3:00 PM",  period: "afternoon", available: true },
    { label: "5:00 PM",  period: "afternoon", available: true },
    { label: "7:00 PM",  period: "evening",   available: true },
    { label: "9:00 PM",  period: "evening",   available: true },
  ],
  behavioral: [
    { label: "9:00 AM",  period: "morning",   available: true },
    { label: "10:30 AM", period: "morning",   available: true },
    { label: "12:00 PM", period: "afternoon", available: true },
    { label: "1:30 PM",  period: "afternoon", available: true },
    { label: "3:00 PM",  period: "afternoon", available: true },
    { label: "4:30 PM",  period: "afternoon", available: true },
    { label: "6:00 PM",  period: "evening",   available: true },
    { label: "7:30 PM",  period: "evening",   available: true },
    { label: "9:00 PM",  period: "evening",   available: true },
  ],
};

// ── Mini-calendar component ───────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Allow only current month and next month
  const curYear  = today.getFullYear();
  const curMonth = today.getMonth();
  const nextMonthDate = new Date(curYear, curMonth + 1, 1);
  const maxYear  = nextMonthDate.getFullYear();
  const maxMonth = nextMonthDate.getMonth();
  // Last selectable day = last day of next month
  const maxDate  = new Date(maxYear, maxMonth + 1, 0);
  maxDate.setHours(0, 0, 0, 0);

  const [viewYear,  setViewYear]  = useState(curYear);
  const [viewMonth, setViewMonth] = useState(curMonth);

  const canGoPrev = viewYear > curYear || viewMonth > curMonth;
  const canGoNext = viewYear < maxYear  || (viewYear === maxYear && viewMonth < maxMonth);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="calendar-wrap">
      <div className="calendar-nav">
        <button
          className="calendar-nav-btn"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          style={{ opacity: canGoPrev ? 1 : 0.25, cursor: canGoPrev ? "pointer" : "default" }}
        >‹</button>
        <span className="calendar-month">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          className="calendar-nav-btn"
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
          style={{ opacity: canGoNext ? 1 : 0.25, cursor: canGoNext ? "pointer" : "default" }}
        >›</button>
      </div>
      <div className="calendar-grid">
        {DOW.map(d => (
          <div key={d} className="calendar-dow">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="calendar-day empty" />;
          }
          const date      = new Date(viewYear, viewMonth, day);
          const isPast    = date < today;
          const isBeyond  = date > maxDate;
          const isDisabled = isPast || isBeyond;
          const isToday   = date.getTime() === today.getTime();
          const isSel     = selected?.getTime() === date.getTime();
          const cls = [
            "calendar-day",
            isDisabled ? "disabled" : "",
            isToday    ? "today"    : "",
            isSel      ? "selected" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              key={day}
              className={cls}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(date)}
              aria-label={`${MONTHS[viewMonth]} ${day}, ${viewYear}${isToday ? " (today)" : ""}`}
              aria-pressed={isSel}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Stepper indicator ─────────────────────────────────────────────────────────

function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="stepper" aria-label="Step progress">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "";
        return (
          <div key={`step-group-${i}`} style={{ display: "contents" }}>
            <div className="stepper-step">
              <div
                className={`stepper-dot ${state}`}
                aria-current={state === "active" ? "step" : undefined}
              >
                {i < current ? "✓" : i + 1}
              </div>
              <span className={`stepper-label ${state}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`stepper-line ${i < current ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Option tile ───────────────────────────────────────────────────────────────

function OptionTile({
  icon,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`option-tile ${selected ? "selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="tile-icon" aria-hidden="true">{icon}</span>
      <span className="tile-body">
        <span className="tile-title">{title}</span>
        <span className="tile-desc">{desc}</span>
      </span>
      <span className="tile-radio" aria-hidden="true">
        <span className="tile-radio-inner" />
      </span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PEER MODAL
// ════════════════════════════════════════════════════════════════════════════

const PEER_STEPS = ["Track", "Type", "Level", "Schedule"];

export function PeerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { getToken } = useAuth();
  const [step, setStep]         = useState(0);
  const [track, setTrack]       = useState<Track>(null);
  const [difficulty, setDiff]   = useState<Difficulty>(null);
  const [selDate, setSelDate]   = useState<Date | null>(null);
  const [selSlot, setSelSlot]   = useState<string | null>(null);
  const [slotFilter, setSF]     = useState<SlotFilter>("all");
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [loadingSlots, setLoad] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]         = useState(false);

  // When date changes on step 3: show default slots immediately, then fetch real availability
  useEffect(() => {
    if (!selDate || step !== 3 || !track || !difficulty) return;
    setSelSlot(null);
    // Show all slots for this track right away (all available by default)
    const defaults = DEFAULT_SLOTS[track] ?? [];
    setSlots(defaults);
    setLoad(true);
    const dateStr = selDate.toISOString().split("T")[0];
    authedRequest<Slot[]>(
      `/api/sessions/available-slots?date=${dateStr}&track=${track}&difficulty=${difficulty}`,
      getToken,
    )
      .then(data => setSlots(data))
      .catch(() => { /* keep defaults — all slots shown as available */ })
      .finally(() => setLoad(false));
  }, [selDate, step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Prevent background page scroll while modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const filteredSlots = slots.filter(
    s => slotFilter === "all" || s.period === slotFilter
  );

  const canContinue = [
    !!track,
    true,   // type is single-option; always valid
    !!difficulty,
    !!(selDate && selSlot),
  ][step];

  const handleConfirm = async () => {
    if (!selDate || !selSlot || !track || !difficulty) return;
    setSubmitting(true);
    try {
      await authedRequest("/api/sessions/peer", getToken, {
        method: "POST",
        body: JSON.stringify({
          track,
          difficulty,
          date: selDate.toISOString().split("T")[0],
          time: selSlot,
        }),
      });
      onSuccess?.();
      setDone(true);
    } catch (err: unknown) {
      alert(`Failed to schedule: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  if (done) {
    return (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Session scheduled"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="modal">
          <div className="modal-header">
            <div />
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="success-state">
            <div className="success-icon" aria-hidden="true" style={{ color: "var(--primary-light)" }}><IconCheckCircle /></div>
            <h2 className="success-title">You&apos;re all set!</h2>
            <p className="success-sub">
              Your mock interview has been scheduled. We&apos;ll match you with a peer shortly
              and send a confirmation to your email.
            </p>
            <div className="success-details" role="list" aria-label="Session details">
              {[
                ["Track",       track === "dsa" ? "Data Structures & Algorithms" : "Behavioral"],
                ["Level",       difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : ""],
                ["Mode",        "Peer Match"],
                ["Date",        selDate ? formatDate(selDate) : ""],
                ["Time",        selSlot ?? ""],
              ].map(([k, v]) => (
                <div key={k} className="success-detail-row" role="listitem">
                  <span className="success-detail-key">{k}</span>
                  <span className="success-detail-val">{v}</span>
                </div>
              ))}
            </div>
            <div className="success-actions">
              <button className="btn-modal-primary" onClick={() => alert("ICS download coming soon!")}>
                <IconCalendar /> Add to Calendar
              </button>
              <button className="btn-modal-ghost" onClick={onClose}>
                View in My Sessions
              </button>
              <button
                className="btn-modal-secondary"
                onClick={() => { setDone(false); setStep(0); setTrack(null); setDiff(null); setSelDate(null); setSelSlot(null); setSlots([]); }}
              >
                Schedule Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="peer-modal-title"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="peer-modal-title">Schedule with a Peer</h2>
            <p className="modal-subtitle">We&apos;ll match you with someone at your level</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "1rem 1.75rem 0" }}>
          <Stepper steps={PEER_STEPS} current={step} />
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* ─── Step 0: Choose track ─── */}
          {step === 0 && (
            <div>
              <p className="modal-section-label">Choose your interview track</p>
              <div className="tile-grid tile-grid-2">
                <OptionTile
                  icon={<IconCode />}
                  title="Data Structures & Algorithms"
                  desc="Solve coding challenges covering arrays, trees, graphs, and more."
                  selected={track === "dsa"}
                  onClick={() => setTrack("dsa")}
                />
                <OptionTile
                  icon={<IconChat />}
                  title="Behavioral"
                  desc="Practice structured storytelling using real work experiences."
                  selected={track === "behavioral"}
                  onClick={() => setTrack("behavioral")}
                />
              </div>
            </div>
          )}

          {/* ─── Step 1: Practice type ─── */}
          {step === 1 && (
            <div>
              <p className="modal-section-label">How would you like to practice?</p>
              <div className="tile-grid tile-grid-1">
                <OptionTile
                  icon={<IconUsers />}
                  title="Live Peer Match"
                  desc="We'll pair you with another user at a similar level for a real-time, two-way interview — you take turns interviewing each other."
                  selected={true}
                  onClick={() => {}}
                />
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.75rem", lineHeight: "1.5" }}>
                ✦ Sessions are 60 minutes. You&apos;ll be notified by email when a peer is confirmed.
              </p>
            </div>
          )}

          {/* ─── Step 2: Difficulty ─── */}
          {step === 2 && (
            <div>
              <p className="modal-section-label">Select your experience level</p>
              <div className="tile-grid tile-grid-1">
                {([
                  { val: "beginner",     icon: <IconStar />, title: "Beginner",     desc: "New to technical interviews — getting comfortable with problem-solving patterns and structure." },
                  { val: "intermediate", icon: <IconTarget />, title: "Intermediate", desc: "Have done a few interviews — looking to sharpen approach, speed, and communication." },
                  { val: "advanced",     icon: <IconZap />, title: "Advanced",     desc: "Actively targeting top-tier roles — seeking deep challenge and precise rubric feedback." },
                ] as const).map(({ val, icon, title, desc }) => (
                  <OptionTile
                    key={val}
                    icon={icon}
                    title={title}
                    desc={desc}
                    selected={difficulty === val}
                    onClick={() => setDiff(val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Step 3: Date & time ─── */}
          {step === 3 && (
            <div>
              <p className="modal-section-label">Pick a date & time</p>
              <MiniCalendar selected={selDate} onSelect={setSelDate} />

              {selDate && (
                <div className="slots-section">
                  <div className="slots-label">
                    Available slots for {selDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    <span className="slots-tz">Times in your local timezone</span>
                  </div>
                  <div className="slots-filter">
                    {(["all", "morning", "afternoon", "evening"] as SlotFilter[]).map(f => (
                      <button
                        key={f}
                        className={`slot-filter-btn ${slotFilter === f ? "active" : ""}`}
                        onClick={() => setSF(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>

                  {loadingSlots ? (
                    <div className="slots-loading">
                      <span className="slots-spinner" aria-hidden="true" />
                      Checking availability…
                    </div>
                  ) : (
                    <div className="slots-grid" role="group" aria-label="Available time slots">
                      {filteredSlots.map(slot => (
                        <button
                          key={slot.label}
                          className={`time-slot ${!slot.available ? "unavailable" : ""} ${selSlot === slot.label ? "selected" : ""}`}
                          disabled={!slot.available}
                          onClick={() => slot.available && setSelSlot(slot.label)}
                          aria-pressed={selSlot === slot.label}
                          aria-disabled={!slot.available}
                        >
                          {slot.label}
                        </button>
                      ))}
                      {filteredSlots.length === 0 && (
                        <p style={{ gridColumn: "1/-1", color: "var(--muted)", fontSize: "0.82rem", textAlign: "center" }}>
                          No slots in this period. Try another filter.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!selDate && (
                <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.85rem" }}>
                  ← Select a date to see available time slots.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 0 ? (
            <button className="btn-modal-secondary" onClick={() => setStep(s => s - 1)}>
              ← Back
            </button>
          ) : (
            <button className="btn-modal-secondary" onClick={onClose}>Cancel</button>
          )}

          {step < PEER_STEPS.length - 1 ? (
            <button
              className="btn-modal-primary"
              disabled={!canContinue}
              onClick={() => setStep(s => s + 1)}
            >
              Continue →
            </button>
          ) : (
            <button
              className="btn-modal-primary"
              disabled={!canContinue || submitting}
              onClick={handleConfirm}
            >
              {submitting ? "Scheduling…" : "✓ Confirm & Schedule"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FRIEND MODAL
// ════════════════════════════════════════════════════════════════════════════

export function FriendModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { getToken } = useAuth();
  const [step, setStep]           = useState(0);
  const [track, setTrack]         = useState<Track>(null);
  const [email, setEmail]         = useState("");
  const [message, setMessage]     = useState("");
  const [emailErr, setEmailErr]   = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied]       = useState(false);
  const [sending, setSending]     = useState(false);
  const [sent, setSent]           = useState(false);

  // ESC to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Prevent background page scroll while modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const validateEmail = (v: string) => {
    if (!v) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Please enter a valid email address.";
    return "";
  };

  const handleSend = async () => {
    const err = validateEmail(email);
    if (err) { setEmailErr(err); return; }
    setSending(true);
    try {
      const res = await authedRequest<{ invite_link: string }>("/api/sessions/friend", getToken, {
        method: "POST",
        body: JSON.stringify({ track, email, message: message || null }),
      });
      setInviteLink(res.invite_link);
      onSuccess?.();
      setSent(true);
    } catch (e: unknown) {
      alert(`Failed to send invite: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [inviteLink]);

  if (sent) {
    return (
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Invite sent"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="modal">
          <div className="modal-header">
            <div />
            <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <div className="success-state">
            <div className="success-icon" aria-hidden="true" style={{ color: "var(--primary-light)" }}><IconMail /></div>
            <h2 className="success-title">Invite Sent!</h2>
            <p className="success-sub">
              An invitation has been delivered to <strong style={{ color: "var(--foreground)" }}>{email}</strong>.
              They&apos;ll receive a link to join your{" "}
              {track === "dsa" ? "DSA" : "Behavioral"} practice session.
            </p>

            <p className="success-note">
              <IconLink /> Your invite link is also active for the next 7 days. Share it anytime — only the first
              person to join will be matched to this session.
            </p>

            <div className="invite-link-preview" style={{ marginBottom: "1.25rem" }}>
              <div className="invite-link-label">Your session link</div>
              <div className="invite-link-row">
                <span className="invite-link-url">{inviteLink}</span>
                <button
                  className={`invite-copy-btn ${copied ? "copied" : ""}`}
                  onClick={handleCopy}
                  aria-label="Copy invite link"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="btn-modal-primary"
                onClick={() => { setSent(false); setStep(0); setTrack(null); setEmail(""); setMessage(""); setEmailErr(""); setInviteLink(""); }}
              >
                Invite Another Friend
              </button>
              <button className="btn-modal-ghost" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-modal-title"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="friend-modal-title">Practice with a Friend</h2>
            <p className="modal-subtitle">Send an invite and choose your own schedule</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {/* Stepper */}
        <div style={{ padding: "1rem 1.75rem 0" }}>
          <Stepper steps={["Track", "Invite"]} current={step} />
        </div>

        <div className="modal-body">

          {/* ─── Step 0: Choose track ─── */}
          {step === 0 && (
            <div>
              <p className="modal-section-label">What will you practice together?</p>
              <div className="tile-grid tile-grid-2">
                <OptionTile
                  icon={<IconCode />}
                  title="Data Structures & Algorithms"
                  desc="Tackle coding problems side-by-side with your friend."
                  selected={track === "dsa"}
                  onClick={() => setTrack("dsa")}
                />
                <OptionTile
                  icon={<IconChat />}
                  title="Behavioral"
                  desc="Give each other feedback on stories and communication."
                  selected={track === "behavioral"}
                  onClick={() => setTrack("behavioral")}
                />
              </div>
            </div>
          )}

          {/* ─── Step 1: Invite friend ─── */}
          {step === 1 && (
            <div>
              <p className="modal-section-label">Send your friend an invite</p>

              {/* Email */}
              <label htmlFor="friend-email" className="invite-label">Friend&apos;s email address</label>
              <input
                id="friend-email"
                type="email"
                className={`invite-input ${emailErr ? "error" : ""}`}
                placeholder="friend@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                autoFocus
                aria-describedby={emailErr ? "email-error" : undefined}
                aria-invalid={!!emailErr}
              />
              {emailErr && <span className="invite-input-error" id="email-error" role="alert">{emailErr}</span>}

              {/* Message */}
              <label htmlFor="friend-msg" className="invite-label" style={{ marginTop: "0.85rem" }}>
                Personal message <span style={{ color: "var(--muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                id="friend-msg"
                className="invite-textarea"
                placeholder="Hey! Want to do a mock interview together? I'm preparing for…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={280}
              />

              {/* Invite link preview */}
              <div className="invite-link-preview">
                <div className="invite-link-label">Invite link — generated on send</div>
                <div className="invite-link-row">
                  <span className="invite-link-url" style={{ color: "var(--muted)", fontStyle: "italic" }}>
                    Link will appear here after sending
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: "1.55" }}>
                Your friend will receive an email with this link. The invite expires in 7 days.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step > 0 ? (
            <button className="btn-modal-secondary" onClick={() => setStep(0)}>← Back</button>
          ) : (
            <button className="btn-modal-secondary" onClick={onClose}>Cancel</button>
          )}

          {step === 0 ? (
            <button
              className="btn-modal-primary"
              disabled={!track}
              onClick={() => setStep(1)}
            >
              Continue →
            </button>
          ) : (
            <button className="btn-modal-primary" onClick={handleSend} disabled={sending}>
              {sending ? "Sending…" : "Send Invite"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
