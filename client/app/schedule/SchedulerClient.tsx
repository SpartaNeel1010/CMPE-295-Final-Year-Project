"use client";

import { useState } from "react";
import ScheduleNavbar from "@/components/schedule/ScheduleNavbar";
import { PeerModal, FriendModal } from "@/components/schedule/ScheduleModals";

// ── Page-level SVG icons ──────────────────────────────────────────────────────

const IcoPeer = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IcoSend = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoGlobe = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);
// Action button icons
const IcoEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoX = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Sample past/upcoming sessions (mock data) ────────────────────────────────

type SessionStatus = "Scheduled" | "Completed" | "Cancelled";
type SessionMode   = "Peer" | "Friend";
type SessionTrack  = "DSA" | "Behavioral";

interface Session {
  id: number;
  date: string;
  time: string;
  track: SessionTrack;
  mode: SessionMode;
  status: SessionStatus;
  partner?: string;
}

const SAMPLE_SESSIONS: Session[] = [
  { id: 1, date: "Mar 14, 2026", time: "2:30 PM", track: "DSA",        mode: "Peer",   status: "Scheduled",  partner: "Alex K." },
  { id: 2, date: "Mar 8,  2026", time: "10:00 AM", track: "Behavioral", mode: "Friend", status: "Completed",  partner: "Priya M." },
  { id: 3, date: "Mar 2,  2026", time: "4:00 PM",  track: "DSA",        mode: "Peer",   status: "Completed",  partner: "Jordan T." },
];

// ── Session filter tabs ───────────────────────────────────────────────────────

type FilterTab = "All" | "Upcoming" | "Completed";

// ── Main client component ─────────────────────────────────────────────────────

export default function SchedulerClient() {
  const [peerOpen,   setPeerOpen]   = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [filterTab,  setFilterTab]  = useState<FilterTab>("All");

  const filtered = SAMPLE_SESSIONS.filter(s => {
    if (filterTab === "Upcoming")  return s.status === "Scheduled";
    if (filterTab === "Completed") return s.status === "Completed";
    return true;
  });

  return (
    <div className="schedule-page">
      {/* Nav */}
      <ScheduleNavbar />

      <main className="schedule-container" id="main-content">

        {/* ── Page header ── */}
        <header className="schedule-header">
          <h1 className="schedule-title">
            Plan Your Next Mock Interview
          </h1>
          <p className="schedule-subtitle">
            Choose a format, pick your track, and lock in a time that works for you — we&apos;ll handle the rest.
          </p>
        </header>

        {/* ── Two-column layout ── */}
        <div className="schedule-layout">

          {/* ════ LEFT COLUMN ════ */}
          <div>
            {/* ── Entry cards ── */}
            <section aria-labelledby="entry-cards-label">
              <h2 id="entry-cards-label" className="sessions-title" style={{ marginBottom: "1rem" }}>
                Start a Session
              </h2>

              <div className="entry-cards">

                {/* Peer card */}
                <button
                  className="entry-card"
                  id="open-peer-modal"
                  onClick={() => setPeerOpen(true)}
                  aria-haspopup="dialog"
                  aria-label="Schedule a mock interview with a peer"
                >
                  <div className="entry-card-icon" aria-hidden="true"><IcoPeer /></div>
                  <div className="entry-card-title">Schedule with a Peer</div>
                  <div className="entry-card-desc">
                    Get matched with another candidate at your level. Take turns playing interviewer
                    and interviewee — just like the real thing.
                  </div>
                  <div className="entry-card-arrow" aria-hidden="true">
                    Get matched →
                  </div>
                </button>

                {/* Friend card */}
                <button
                  className="entry-card"
                  id="open-friend-modal"
                  onClick={() => setFriendOpen(true)}
                  aria-haspopup="dialog"
                  aria-label="Invite a friend to practice together"
                >
                  <div className="entry-card-icon" aria-hidden="true"><IcoSend /></div>
                  <div className="entry-card-title">Practice with a Friend</div>
                  <div className="entry-card-desc">
                    Already have someone in mind? Send them a private invite link and schedule
                    a session on your own terms.
                  </div>
                  <div className="entry-card-arrow" aria-hidden="true">
                    Send invite →
                  </div>
                </button>
              </div>
            </section>

            {/* ── Sessions table ── */}
            <section aria-labelledby="sessions-label" className="sessions-section">
              <div className="sessions-header">
                <h2 id="sessions-label" className="sessions-title">Your Sessions</h2>
                <div className="sessions-filter" role="group" aria-label="Filter sessions">
                  {(["All", "Upcoming", "Completed"] as FilterTab[]).map(tab => (
                    <button
                      key={tab}
                      className={`sessions-filter-btn ${filterTab === tab ? "active" : ""}`}
                      onClick={() => setFilterTab(tab)}
                      aria-pressed={filterTab === tab}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sessions-table-wrap">
                {filtered.length === 0 ? (
                  <div className="sessions-empty" aria-live="polite">
                    <div className="sessions-empty-icon" aria-hidden="true">📭</div>
                    <div className="sessions-empty-title">No sessions here yet</div>
                    <div className="sessions-empty-text">
                      {filterTab === "Upcoming"
                        ? "You have no upcoming sessions. Schedule one above!"
                        : filterTab === "Completed"
                        ? "You haven't completed any sessions yet."
                        : "Schedule your first mock interview to get started."}
                    </div>
                  </div>
                ) : (
                  <table className="sessions-table" aria-label="Interview sessions">
                    <thead>
                      <tr>
                        <th scope="col">Date &amp; Time</th>
                        <th scope="col">Track</th>
                        <th scope="col">Mode</th>
                        <th scope="col">Partner</th>
                        <th scope="col">Status</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: "0.86rem" }}>{s.date}</div>
                            <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>{s.time}</div>
                          </td>
                          <td>
                            <span className={`session-badge ${s.track.toLowerCase()}`}>
                              {s.track === "DSA" ? "DSA" : "Behavioral"}
                            </span>
                          </td>
                          <td>
                            <span className={`session-badge ${s.mode.toLowerCase()}`}>
                              {s.mode}
                            </span>
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: "0.84rem" }}>
                            {s.partner ?? "—"}
                          </td>
                          <td>
                            <span className={`session-badge ${s.status.toLowerCase()}`}>
                              {s.status}
                            </span>
                          </td>
                          <td>
                            <div className="session-actions">
                              <button
                                className="session-action-btn"
                                onClick={() => alert(`View session ${s.id}`)}
                                aria-label={`View session on ${s.date}`}
                                title="View"
                              >
                                <IcoEye /> View
                              </button>
                              {s.status === "Scheduled" && (
                                <>
                                  <button
                                    className="session-action-btn"
                                    onClick={() => alert(`Reschedule session ${s.id}`)}
                                    aria-label={`Reschedule session on ${s.date}`}
                                    title="Reschedule"
                                  >
                                    <IcoClock /> Reschedule
                                  </button>
                                  <button
                                    className="session-action-btn danger"
                                    onClick={() => alert(`Cancel session ${s.id}`)}
                                    aria-label={`Cancel session on ${s.date}`}
                                    title="Cancel"
                                  >
                                    <IcoX /> Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <aside className="schedule-sidebar" aria-label="Session sidebar">

            {/* Timezone */}
            <div className="sidebar-card">
              <div className="sidebar-card-title">Your Timezone</div>
              <div className="sidebar-tz-row">
                <span className="sidebar-tz-icon" aria-hidden="true"><IcoGlobe /></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}
                  </div>
                  <div className="sidebar-tz-label">
                    {new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
                      .formatToParts(new Date())
                      .find(p => p.type === "timeZoneName")?.value ?? "Local"}
                    {" · "}
                    {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} now
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.4rem" }}>
                All session times are shown in your detected local timezone.
              </p>
            </div>

            {/* Stats */}
            <div className="sidebar-card">
              <div className="sidebar-card-title">Your Stats</div>
              <div className="sidebar-stat-grid">
                <div className="sidebar-stat">
                  <div className="sidebar-stat-num">
                    {SAMPLE_SESSIONS.filter(s => s.status === "Completed").length}
                  </div>
                  <div className="sidebar-stat-lbl">Completed</div>
                </div>
                <div className="sidebar-stat">
                  <div className="sidebar-stat-num">
                    {SAMPLE_SESSIONS.filter(s => s.status === "Scheduled").length}
                  </div>
                  <div className="sidebar-stat-lbl">Upcoming</div>
                </div>
                <div className="sidebar-stat">
                  <div className="sidebar-stat-num">
                    {SAMPLE_SESSIONS.filter(s => s.track === "DSA").length}
                  </div>
                  <div className="sidebar-stat-lbl">DSA</div>
                </div>
                <div className="sidebar-stat">
                  <div className="sidebar-stat-num">
                    {SAMPLE_SESSIONS.filter(s => s.track === "Behavioral").length}
                  </div>
                  <div className="sidebar-stat-lbl">Behavioral</div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="sidebar-card">
              <div className="sidebar-card-title">Quick Tips</div>
              <ul className="sidebar-tips" aria-label="Interview tips">
                {[
                  "Schedule at least 2 sessions per week to build momentum and stay sharp.",
                  "Do DSA sessions in the morning when your problem-solving focus peaks.",
                  "After each session, jot down one thing to improve — small gains compound fast.",
                  "Use behavioral sessions to rehearse your STAR-format stories out loud.",
                ].map((tip, i) => (
                  <li key={i} className="sidebar-tip-item">
                    <span className="sidebar-tip-dot" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

          </aside>
        </div>
      </main>

      {/* ── Modals ── */}
      {peerOpen   && <PeerModal   onClose={() => setPeerOpen(false)}   />}
      {friendOpen && <FriendModal onClose={() => setFriendOpen(false)} />}
    </div>
  );
}
