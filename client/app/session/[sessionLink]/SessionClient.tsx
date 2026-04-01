"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { authedRequest } from "@/lib/api";
import Link from "next/link";

// ── Session data from lobby-status ───────────────────────────────────────────

interface SessionInfo {
  session_link: string;
  status: string;
  host_name: string | null;
  guest_name: string | null;
  scheduled_time: string;
  track: string;
  is_host: boolean;
}

// ── Timer hook ────────────────────────────────────────────────────────────────

function useTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Dummy Two Sum problem ─────────────────────────────────────────────────────

const TWO_SUM_STARTER = `def two_sum(nums: list[int], target: int) -> list[int]:
    """
    Given an array of integers nums and an integer target,
    return indices of the two numbers that add up to target.
    """
    # Your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`;

// ── Syntax-highlighted code renderer (no external lib) ───────────────────────

function CodeLine({ line, num }: { line: string; num: number }) {
  const tokens: { text: string; color: string }[] = [];

  const KEYWORD_RE  = /\b(def|return|if|else|elif|for|in|range|while|import|from|class|pass|None|True|False|and|or|not)\b/g;
  const STRING_RE   = /("""[\s\S]*?"""|"[^"]*"|'[^']*')/g;
  const COMMENT_RE  = /(#.*)/g;
  const NUMBER_RE   = /\b(\d+)\b/g;
  const BUILTIN_RE  = /\b(enumerate|len|list|dict|set|int|str|print|append|zip)\b/g;

  // Collect all token ranges
  type Span = { start: number; end: number; color: string };
  const spans: Span[] = [];

  const addSpans = (re: RegExp, color: string) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, color });
    }
  };

  addSpans(COMMENT_RE,  "#8b92a5");
  addSpans(STRING_RE,   "#86efac");
  addSpans(KEYWORD_RE,  "#818cf8");
  addSpans(NUMBER_RE,   "#fb923c");
  addSpans(BUILTIN_RE,  "#fbbf24");

  // Sort by start, remove overlaps (earlier wins)
  spans.sort((a, b) => a.start - b.start);
  const filtered: Span[] = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.start >= cursor) {
      filtered.push(sp);
      cursor = sp.end;
    }
  }

  // Build token array
  let pos = 0;
  for (const sp of filtered) {
    if (sp.start > pos) tokens.push({ text: line.slice(pos, sp.start), color: "#e8eaf0" });
    tokens.push({ text: line.slice(sp.start, sp.end), color: sp.color });
    pos = sp.end;
  }
  if (pos < line.length) tokens.push({ text: line.slice(pos), color: "#e8eaf0" });

  return (
    <div style={{ display: "flex", minHeight: "1.6em" }}>
      <span style={{ userSelect: "none", minWidth: "2.8rem", paddingRight: "1.2rem", textAlign: "right", color: "#3f4560", fontSize: "0.78rem", flexShrink: 0, paddingTop: "0.05em" }}>
        {num}
      </span>
      <span style={{ flex: 1 }}>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: t.color }}>{t.text}</span>
        ))}
        {tokens.length === 0 && <span>&nbsp;</span>}
      </span>
    </div>
  );
}

// ── Video tile ────────────────────────────────────────────────────────────────

function VideoTile({ name, role, isLive }: { name: string; role: string; isLive?: boolean }) {
  return (
    <div style={{
      flex: 1, position: "relative", background: "#0c0e15",
      border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden",
      minHeight: 0,
    }}>
      {/* Camera placeholder */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "var(--card)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.3rem", fontWeight: 800, color: "var(--muted)",
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* LIVE badge */}
      {isLive && (
        <div style={{
          position: "absolute", top: 10, left: 10,
          background: "#dc2626", color: "#fff",
          fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em",
          padding: "2px 7px", borderRadius: "4px",
        }}>
          LIVE
        </div>
      )}

      {/* Name label */}
      <div style={{
        position: "absolute", bottom: 10, left: 10,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        color: "#fff", fontSize: "0.74rem", fontWeight: 600,
        padding: "3px 10px", borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {role} – {name}
      </div>

      {/* Mic / cam icons */}
      <div style={{
        position: "absolute", bottom: 10, right: 10,
        display: "flex", gap: "0.4rem",
      }}>
        {[
          <svg key="mic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
          <svg key="cam" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
        ].map((icon, i) => (
          <div key={i} style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted)",
          }}>
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", paddingLeft: "1rem" }}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: "0.55rem 1rem",
            fontSize: "0.78rem", fontWeight: 600,
            color: active === t ? "var(--primary-light)" : "var(--muted)",
            background: "transparent", border: "none", cursor: "pointer",
            borderBottom: active === t ? "2px solid var(--primary-light)" : "2px solid transparent",
            marginBottom: "-1px", transition: "color 0.15s",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Test case card ────────────────────────────────────────────────────────────

function TestCard({
  label, input, expected, got, passed,
}: {
  label: string; input: string; expected: string; got: string; passed: boolean;
}) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "0.75rem 1rem",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.4rem" }}>
          {label}
        </div>
        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
          {[["Input", input], ["Expected", expected], ["Got", got]].map(([k, v]) => (
            <div key={k}>
              <span style={{ fontSize: "0.68rem", color: "var(--muted)", display: "block" }}>{k}</span>
              <code style={{ fontSize: "0.74rem", color: "var(--accent)", fontFamily: "monospace" }}>{v}</code>
            </div>
          ))}
        </div>
      </div>
      <div style={{
        flexShrink: 0,
        padding: "2px 10px", borderRadius: "999px",
        fontSize: "0.7rem", fontWeight: 700,
        background: passed ? "#0d2b1e" : "#2d0e0e",
        color: passed ? "#4ade80" : "#f87171",
        border: `1px solid ${passed ? "#166534" : "#7f1d1d"}`,
        marginTop: "0.15rem",
      }}>
        {passed ? "Passed" : "Failed"}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SessionClientProps { sessionLink: string }

export default function SessionClient({ sessionLink }: SessionClientProps) {
  const { getToken } = useAuth();
  const timer = useTimer();

  const [session,    setSession]    = useState<SessionInfo | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [language,   setLanguage]   = useState("Python");
  const [fontSize,   setFontSize]   = useState(14);
  const [activeTab,  setActiveTab]  = useState("Test Cases");
  const [lastRun,    setLastRun]    = useState<string | null>(null);
  const [running,    setRunning]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    authedRequest<SessionInfo>(
      `/api/sessions/link/${sessionLink}/lobby-status`,
      getToken,
    )
      .then(setSession)
      .catch(err => setError(err.message));
  }, [sessionLink, getToken]);

  // Derived names
  const myName    = session ? (session.is_host ? session.host_name : session.guest_name) ?? "You"    : "You";
  const theirName = session ? (session.is_host ? session.guest_name : session.host_name) ?? "Partner" : "Partner";

  const handleRunCode = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setLastRun("just now");
      setActiveTab("Test Cases");
    }, 1400);
  };

  const handleSubmit = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setSubmitted(true);
      setLastRun("just now");
      setActiveTab("Test Cases");
    }, 2000);
  };

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <p style={{ color: "var(--muted)" }}>{error}</p>
        <Link href="/schedule" style={{ padding: "0.6rem 1.5rem", borderRadius: "8px", background: "var(--primary)", color: "white", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
          Back to schedule
        </Link>
      </div>
    );
  }

  const codeLines = TWO_SUM_STARTER.split("\n");

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.25rem",
        background: "rgba(13,15,20,0.97)", borderBottom: "1px solid var(--border)",
        zIndex: 10,
      }}>
        {/* Left: brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            width: 26, height: 26, background: "var(--primary)", borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "0.72rem", fontWeight: 800,
          }}>
            IR
          </div>
          <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
            InterviewRamp
          </span>
          <span style={{ color: "var(--border)", margin: "0 0.4rem" }}>|</span>
          <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
            {session?.track === "dsa" ? "DSA" : "Behavioral"} · Live Session
          </span>
        </div>

        {/* Right: status + timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: "0.76rem", color: "#22c55e", fontWeight: 600 }}>Connected</span>
          </div>
          <div style={{
            padding: "3px 12px", borderRadius: "999px",
            background: "var(--card)", border: "1px solid var(--border)",
            fontSize: "0.78rem", fontWeight: 700, color: "var(--foreground)",
            fontFamily: "monospace", letterSpacing: "0.04em",
          }}>
            {timer}
          </div>
          <Link href="/schedule" style={{
            fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none",
            padding: "3px 10px", borderRadius: "6px", border: "1px solid var(--border)",
          }}>
            Exit
          </Link>
        </div>
      </header>

      {/* ── Video row ── */}
      <div style={{
        flexShrink: 0, height: 154,
        display: "flex", gap: "0.75rem",
        padding: "0.6rem 0.75rem",
        borderBottom: "1px solid var(--border)",
        background: "#0a0c11",
      }}>
        <VideoTile name={myName}    role="Interviewer" isLive />
        <VideoTile name={theirName} role="Candidate" />
      </div>

      {/* ── Workspace ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ── Problem panel ── */}
        <div style={{
          width: "33%", flexShrink: 0,
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Problem header */}
          <div style={{
            padding: "0.8rem 1.1rem 0.6rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--card)", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fbbf24", background: "#1c1500", border: "1px solid #78350f", padding: "1px 8px", borderRadius: "999px" }}>
                Medium
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>#1</span>
            </div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              Two Sum
            </h2>
          </div>

          {/* Scrollable problem body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem", fontSize: "0.82rem", lineHeight: 1.7, color: "var(--foreground)" }}>

            <ProbSection title="Description">
              <p>
                Given an array of integers <code style={codeStyle}>nums</code> and an integer <code style={codeStyle}>target</code>,
                return <em>indices of the two numbers such that they add up to <code style={codeStyle}>target</code></em>.
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                You may assume that each input would have <strong>exactly one solution</strong>, and you may not use
                the same element twice. You can return the answer in any order.
              </p>
            </ProbSection>

            <ProbSection title="Example 1">
              <ExampleBlock
                lines={[
                  ["Input",  "nums = [2, 7, 11, 15], target = 9"],
                  ["Output", "[0, 1]"],
                  ["Explanation", "nums[0] + nums[1] == 9, return [0, 1]."],
                ]}
              />
            </ProbSection>

            <ProbSection title="Example 2">
              <ExampleBlock
                lines={[
                  ["Input",  "nums = [3, 2, 4], target = 6"],
                  ["Output", "[1, 2]"],
                ]}
              />
            </ProbSection>

            <ProbSection title="Constraints">
              <ul style={{ paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[
                  "2 ≤ nums.length ≤ 10⁴",
                  "-10⁹ ≤ nums[i] ≤ 10⁹",
                  "-10⁹ ≤ target ≤ 10⁹",
                  "Only one valid answer exists.",
                ].map((c, i) => (
                  <li key={i} style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                    <code style={{ ...codeStyle, fontSize: "0.76rem" }}>{c}</code>
                  </li>
                ))}
              </ul>
            </ProbSection>

            <ProbSection title="Notes">
              <p style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.65 }}>
                Aim for a solution better than O(n²). A hash map approach achieves O(n) time and O(n) space.
                Think about what information you need to store as you scan through the array once.
              </p>
            </ProbSection>

          </div>
        </div>

        {/* ── Editor panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{
            height: 40, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 1rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--card)",
          }}>
            {/* Left: language selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{
                  background: "var(--card-hover)", border: "1px solid var(--border)",
                  color: "var(--foreground)", borderRadius: "6px",
                  padding: "3px 8px", fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer", outline: "none",
                }}
              >
                {["Python", "JavaScript", "TypeScript", "Java", "C++", "Go"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Right: font size, reset, format */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button onClick={() => setFontSize(s => Math.max(11, s - 1))} style={toolBtnStyle}>A−</button>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)", minWidth: "2.5rem", textAlign: "center" }}>{fontSize}px</span>
                <button onClick={() => setFontSize(s => Math.min(20, s + 1))} style={toolBtnStyle}>A+</button>
              </div>
              <div style={{ width: 1, height: 16, background: "var(--border)" }} />
              <button style={toolBtnStyle}>Reset</button>
              <button style={toolBtnStyle}>Format</button>
            </div>
          </div>

          {/* Code editor area */}
          <div style={{
            flex: 1, minHeight: 0, overflowY: "auto",
            background: "#0b0d13", padding: "1rem 0",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontSize: `${fontSize}px`, lineHeight: 1.65,
          }}>
            {codeLines.map((line, i) => (
              <CodeLine key={i} line={line} num={i + 1} />
            ))}
          </div>

          {/* Action bar */}
          <div style={{
            flexShrink: 0, height: 48,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 1rem",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
          }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={handleRunCode}
                disabled={running}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "7px",
                  border: "1px solid var(--border)", background: "var(--card-hover)",
                  color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 600,
                  cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: "0.35rem",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {running ? "Running…" : "Run Code"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitted}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "7px",
                  border: "none",
                  background: submitted ? "#0d2b1e" : "var(--primary)",
                  color: submitted ? "#4ade80" : "white",
                  fontSize: "0.8rem", fontWeight: 700,
                  cursor: (running || submitted) ? "not-allowed" : "pointer",
                  opacity: running ? 0.6 : 1,
                }}
              >
                {submitted ? "✓ Submitted" : "Submit"}
              </button>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
              {lastRun ? `Last run: ${lastRun}` : "No runs yet"}
            </span>
          </div>

          {/* Results panel */}
          <div style={{
            flexShrink: 0, height: 210,
            borderTop: "1px solid var(--border)",
            background: "#0a0c12",
            display: "flex", flexDirection: "column",
          }}>
            <TabBar
              tabs={["Test Cases", "Console", "Performance"]}
              active={activeTab}
              onChange={setActiveTab}
            />

            <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeTab === "Test Cases" && (
                <>
                  <TestCard
                    label="Sample Test Case 1"
                    input="nums=[2,7,11,15], target=9"
                    expected="[0,1]"
                    got="[0,1]"
                    passed
                  />
                  <TestCard
                    label="Sample Test Case 2"
                    input="nums=[3,2,4], target=6"
                    expected="[1,2]"
                    got="[0,2]"
                    passed={false}
                  />
                </>
              )}
              {activeTab === "Console" && (
                <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--muted)", padding: "0.25rem" }}>
                  <span style={{ color: "#4ade80" }}>$</span> Run your code to see console output here.
                </div>
              )}
              {activeTab === "Performance" && (
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", padding: "0.25rem" }}>
                  Performance metrics will appear after submission.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style>{sessionStyles}</style>
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function ProbSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <div style={{
        fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "var(--primary-light)",
        marginBottom: "0.5rem",
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ExampleBlock({ lines }: { lines: [string, string][] }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "0.65rem 0.85rem",
      display: "flex", flexDirection: "column", gap: "0.25rem",
    }}>
      {lines.map(([k, v]) => (
        <div key={k} style={{ display: "flex", gap: "0.5rem", fontSize: "0.78rem" }}>
          <span style={{ color: "var(--muted)", flexShrink: 0, minWidth: "5.5rem" }}>{k}:</span>
          <code style={{ color: "var(--accent)", fontFamily: "monospace", fontSize: "0.76rem" }}>{v}</code>
        </div>
      ))}
    </div>
  );
}

// ── Shared micro-styles ───────────────────────────────────────────────────────

const codeStyle: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--border)",
  borderRadius: "4px", padding: "1px 5px",
  fontFamily: "monospace", fontSize: "0.78rem", color: "var(--accent)",
};

const toolBtnStyle: React.CSSProperties = {
  background: "transparent", border: "none",
  color: "var(--muted)", fontSize: "0.74rem", fontWeight: 600,
  cursor: "pointer", padding: "3px 7px", borderRadius: "5px",
  transition: "color 0.15s, background 0.15s",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const sessionStyles = `
  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: #2e3348; }

  /* Select dropdown arrow color fix */
  select option { background: #13161e; }
`;
