"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { authedRequest } from "@/lib/api";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track } from "livekit-client";

// ── Session data from lobby-status ───────────────────────────────────────────

interface SessionInfo {
  session_link: string;
  status: string;
  host_name: string | null;
  guest_name: string | null;
  scheduled_time: string;
  track: string;
  difficulty: string;
  is_host: boolean;
  question1: Question | null;
  question2: Question | null;
  code_round1: string | null;
  code_round2: string | null;
  lang_round1: string;
  lang_round2: string;
  started_at: string | null;
}

// ── Timer hook ────────────────────────────────────────────────────────────────

/** Forces a re-render every second. Returns current Date.now(). */
function useTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return Date.now();
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const ROUND_SECS = 30 * 60; // 30 minutes per round

// ── Question types ────────────────────────────────────────────────────────────

interface QuestionExample {
  input: string;
  output: string;
  explanation?: string;
}

interface Question {
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  examples: QuestionExample[];
  constraints: string[];
  notes?: string;
  starter_code: Record<string, string>;
  test_cases: { label: string; input_display: string; expected_display: string }[];
}

// ── Test result from /api/execute ────────────────────────────────────────────

interface TestResult {
  label:    string;
  passed:   boolean;
  got:      string;    // JSON-serialised value
  expected: string;    // JSON-serialised value
  hidden:   boolean;
}

// ── Language config ───────────────────────────────────────────────────────────

const LANGUAGES = ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go"] as const;
type Language = typeof LANGUAGES[number];

// Keys match question.starter_code keys stored in MongoDB
const LANG_KEY: Record<Language, string> = {
  Python:     "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Java:       "java",
  "C++":      "cpp",
  Go:         "go",
};

const MONACO_LANGUAGE: Record<Language, string> = {
  Python:     "python",
  JavaScript: "javascript",
  TypeScript: "typescript",
  Java:       "java",
  "C++":      "cpp",
  Go:         "go",
};

const STARTER_CODE: Record<Language, string> = {
  Python: `def two_sum(nums: list[int], target: int) -> list[int]:
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
`,
  JavaScript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Your solution here
    const seen = {};
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (complement in seen) return [seen[complement], i];
        seen[nums[i]] = i;
    }
    return [];
}
`,
  TypeScript: `function twoSum(nums: number[], target: number): number[] {
    // Your solution here
    const seen: Record<number, number> = {};
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (complement in seen) return [seen[complement], i];
        seen[nums[i]] = i;
    }
    return [];
}
`,
  Java: `import java.util.HashMap;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
        HashMap<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), i};
            }
            seen.put(nums[i], i);
        }
        return new int[]{};
    }
}
`,
  "C++": `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your solution here
        unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) return {seen[complement], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`,
  Go: `package main

func twoSum(nums []int, target int) []int {
    // Your solution here
    seen := make(map[int]int)
    for i, num := range nums {
        complement := target - num
        if j, ok := seen[complement]; ok {
            return []int{j, i}
        }
        seen[num] = i
    }
    return nil
}
`,
};

// ── Video tile ────────────────────────────────────────────────────────────────

const TILE_STYLE: React.CSSProperties = {
  flex: 1, position: "relative", background: "#0c0e15",
  border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden",
  minHeight: 0,
};

const NAME_LABEL_STYLE: React.CSSProperties = {
  position: "absolute", bottom: 10, left: 10,
  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
  color: "#fff", fontSize: "0.74rem", fontWeight: 600,
  padding: "3px 10px", borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.08)",
};

function VideoAvatar({ name }: { name: string }) {
  return (
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
  );
}

// Rendered inside <LiveKitRoom> — has access to LiveKit hooks
function VideoTiles({
  myName, theirName, myRole, theirRole, mediaAllowed,
}: { myName: string; theirName: string; myRole: string; theirRole: string; mediaAllowed: boolean }) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const remote = remoteParticipants[0] ?? null;

  const localCamPub  = localParticipant?.getTrackPublication(Track.Source.Camera);
  const remoteCamPub = remote?.getTrackPublication(Track.Source.Camera);
  const hasLocalVideo  = isCameraEnabled  && !!localCamPub?.track  && !localCamPub.isMuted;
  const hasRemoteVideo = !!remoteCamPub?.track && !remoteCamPub.isMuted;

  const toggleMic = async () => {
    if (!mediaAllowed) return;
    try { await localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled); }
    catch (e) { console.warn("Mic toggle failed:", e); }
  };
  const toggleCam = async () => {
    if (!mediaAllowed) return;
    try { await localParticipant?.setCameraEnabled(!isCameraEnabled); }
    catch (e) { console.warn("Camera toggle failed:", e); }
  };

  return (
    <>
      {/* ── Local tile ── */}
      <div style={TILE_STYLE}>
        {hasLocalVideo && localCamPub ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <VideoTrack
              trackRef={{ participant: localParticipant, publication: localCamPub, source: Track.Source.Camera }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <VideoAvatar name={myName} />
        )}

        {/* LIVE badge */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "#dc2626", color: "#fff", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "4px" }}>
          LIVE
        </div>

        <div style={NAME_LABEL_STYLE}>{myRole} – {myName}</div>

        {/* Mic + cam toggles */}
        <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: "0.4rem" }}>
          <button
            onClick={toggleMic}
            title={!mediaAllowed ? "Requires HTTPS" : isMicrophoneEnabled ? "Mute mic" : "Unmute mic"}
            disabled={!mediaAllowed}
            style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", cursor: mediaAllowed ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", background: !isMicrophoneEnabled ? "#7f1d1d" : "rgba(0,0,0,0.5)", color: !isMicrophoneEnabled ? "#fca5a5" : "var(--muted)", opacity: mediaAllowed ? 1 : 0.5 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isMicrophoneEnabled
                ? <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
                : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
              }
            </svg>
          </button>
          <button
            onClick={toggleCam}
            title={!mediaAllowed ? "Requires HTTPS" : isCameraEnabled ? "Turn off camera" : "Turn on camera"}
            disabled={!mediaAllowed}
            style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.15)", cursor: mediaAllowed ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", background: !isCameraEnabled ? "#7f1d1d" : "rgba(0,0,0,0.5)", color: !isCameraEnabled ? "#fca5a5" : "var(--muted)", opacity: mediaAllowed ? 1 : 0.5 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isCameraEnabled
                ? <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>
                : <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h1a2 2 0 0 1 2 2v9.34"/><path d="M23 7L16 12l7 5V7z"/></>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Remote tile ── */}
      <div style={TILE_STYLE}>
        {hasRemoteVideo && remoteCamPub && remote ? (
          <div style={{ position: "absolute", inset: 0 }}>
            <VideoTrack
              trackRef={{ participant: remote, publication: remoteCamPub, source: Track.Source.Camera }}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <VideoAvatar name={theirName} />
        )}

        <div style={NAME_LABEL_STYLE}>{theirRole} – {theirName}</div>

        {!remote && (
          <div style={{ position: "absolute", top: 10, right: 10, fontSize: "0.68rem", color: "var(--muted)", background: "rgba(0,0,0,0.5)", padding: "2px 8px", borderRadius: "4px" }}>
            Waiting…
          </div>
        )}
      </div>
    </>
  );
}

// Fetches LiveKit token and manages the LiveKitRoom connection
function VideoConferenceRow({
  sessionLink, myName, theirName, myRole, theirRole, getToken,
}: {
  sessionLink: string;
  myName: string; theirName: string;
  myRole: string; theirRole: string;
  getToken: () => Promise<string | null>;
}) {
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    let active = true;
    authedRequest<{ token: string; url: string }>(
      `/api/sessions/link/${sessionLink}/livekit-token`,
      getTokenRef.current,
    )
      .then(data => { if (active) setLivekitToken(data.token); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [sessionLink]);

  const lkUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
  // navigator.mediaDevices is only available in secure contexts (HTTPS or localhost)
  const mediaAllowed = typeof window !== "undefined" && !!navigator.mediaDevices;
  const rowStyle: React.CSSProperties = {
    flexShrink: 0, height: 154, display: "flex", gap: "0.75rem",
    padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--border)",
    background: "#0a0c11",
  };

  // Fallback: show avatar tiles if LiveKit is not configured or token failed
  if (failed || !lkUrl || lkUrl.startsWith("wss://your-project")) {
    return (
      <div style={rowStyle}>
        <FallbackVideoTile name={myName}    role={myRole}    isLive />
        <FallbackVideoTile name={theirName} role={theirRole} />
      </div>
    );
  }

  if (!livekitToken) {
    // Loading — show avatars while waiting for token
    return (
      <div style={rowStyle}>
        <FallbackVideoTile name={myName}    role={myRole}    isLive />
        <FallbackVideoTile name={theirName} role={theirRole} />
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={lkUrl}
      video={mediaAllowed}
      audio={mediaAllowed}
      connect
      options={{ disconnectOnPageLeave: true }}
      style={{ display: "contents" } as React.CSSProperties}
    >
      <RoomAudioRenderer />
      <div style={rowStyle}>
        <VideoTiles
          myName={myName} theirName={theirName}
          myRole={myRole} theirRole={theirRole}
          mediaAllowed={mediaAllowed}
        />
      </div>
    </LiveKitRoom>
  );
}

// Non-LiveKit fallback tile (shown while loading / when LK is not configured)
function FallbackVideoTile({ name, role, isLive }: { name: string; role: string; isLive?: boolean }) {
  return (
    <div style={TILE_STYLE}>
      <VideoAvatar name={name} />
      {isLive && (
        <div style={{ position: "absolute", top: 10, left: 10, background: "#dc2626", color: "#fff", fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.1em", padding: "2px 7px", borderRadius: "4px" }}>
          LIVE
        </div>
      )}
      <div style={NAME_LABEL_STYLE}>{role} – {name}</div>
      <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: "0.4rem" }}>
        {[
          <svg key="mic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
          <svg key="cam" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
        ].map((icon, i) => (
          <div key={i} style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
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
    <div style={{ display: "flex", gap: 0, paddingLeft: "1rem" }}>
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
  label, input, expected, got, passed, pending, hidden,
}: {
  label: string; input: string; expected: string; got: string;
  passed: boolean; pending?: boolean; hidden?: boolean;
}) {
  const badge = pending
    ? { bg: "var(--card)", color: "var(--muted)", border: "var(--border)", text: "Pending" }
    : passed
      ? { bg: "#0d2b1e", color: "#4ade80", border: "#166534", text: "Passed" }
      : { bg: "#2d0e0e", color: "#f87171", border: "#7f1d1d", text: "Failed" };

  return (
    <div style={{
      background: "var(--card)", border: `1px solid ${hidden && !pending ? (passed ? "#166534" : "#7f1d1d") : "var(--border)"}`,
      borderRadius: "8px", padding: "0.75rem 1rem",
      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
      opacity: hidden ? 0.85 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--foreground)" }}>
            {label}
          </span>
          {hidden && (
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "var(--muted)",
              background: "var(--card-hover)", border: "1px solid var(--border)",
              padding: "1px 6px", borderRadius: "999px", letterSpacing: "0.04em" }}>
              HIDDEN
            </span>
          )}
        </div>
        {hidden && !pending ? (
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>
            Hidden test case — details not shown
          </div>
        ) : (
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {[["Input", input], ["Expected", expected], ...(!pending ? [["Got", got]] : [])].map(([k, v]) => (
              <div key={k}>
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", display: "block" }}>{k}</span>
                <code style={{ fontSize: "0.74rem", color: "var(--accent)", fontFamily: "monospace" }}>{v}</code>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{
        flexShrink: 0,
        padding: "2px 10px", borderRadius: "999px",
        fontSize: "0.7rem", fontWeight: 700,
        background: badge.bg, color: badge.color,
        border: `1px solid ${badge.border}`,
        marginTop: "0.15rem",
      }}>
        {badge.text}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SessionClientProps { sessionLink: string }

export default function SessionClient({ sessionLink }: SessionClientProps) {
  const { getToken } = useAuth();
  const now = useTick();

  const [session,         setSession]         = useState<SessionInfo | null>(null);
  const [error,           setError]           = useState<string | null>(null);
  const [language,        setLanguage]        = useState<Language>("Python");
  const [codeByRound,     setCodeByRound]     = useState<[string, string]>(["", ""]);
  const [fontSize,        setFontSize]        = useState(14);
  const [activeTab,       setActiveTab]       = useState("Test Cases");
  const [lastRun,         setLastRun]         = useState<string | null>(null);
  const [running,         setRunning]         = useState(false);
  const [submittedRounds, setSubmittedRounds] = useState<[boolean, boolean]>([false, false]);
  const [testResults,     setTestResults]     = useState<TestResult[] | null>(null);
  const [isSubmitRun,     setIsSubmitRun]     = useState(false);
  // Round-advance handshake
  const [myReadyForR2,      setMyReadyForR2]      = useState(false);
  const [partnerReadyForR2, setPartnerReadyForR2] = useState(false);
  const [forcedR2At,        setForcedR2At]        = useState<number | null>(null);
  // Exit confirmation
  const [showExitConfirm,   setShowExitConfirm]   = useState(false);
  const [exitLoading,       setExitLoading]       = useState(false);
  const [questions,       setQuestions]       = useState<Question[]>([]);
  // Feedback overlay state
  const [feedbackState,   setFeedbackState]   = useState<"idle" | "form" | "submitting" | "done" | "already_done">("idle");
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, number>>({});
  const [feedbackComments, setFeedbackComments] = useState("");
  // Partner left state
  const [partnerLeft,     setPartnerLeft]     = useState(false);
  const [partnerLeftAckd, setPartnerLeftAckd] = useState(false); // dismissed the initial banner
  // AI feedback state
  const [aiFeedbackState, setAiFeedbackState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [aiFeedbackData,  setAiFeedbackData]  = useState<Record<string, unknown> | null>(null);
  const [aiFeedbackRound, setAiFeedbackRound] = useState<1 | 2>(1);
  // Transcript accumulator: captures timestamped chat lines during each round
  const transcriptRef = useRef<string[]>([]);

  // Ref to track whether we've already initialised code/language (runs once, after questions arrive)
  const codeInitialised = useRef(false);

  // Capture getToken in a ref so it's never a useEffect dependency (avoids
  // cancelling in-flight fetches when Clerk recreates the function on re-renders)
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  // ── WebSocket ref ──────────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null);

  // Stable refs for use inside debounced effects (avoids stale closures)
  const isIntervieweeRef = useRef(true);
  const roundRef         = useRef<1 | 2>(1);

  // ── Panel sizing & visibility ──────────────────────────────────────────────
  const [problemWidth,   setProblemWidth]   = useState(360);
  const [resultHeight,   setResultHeight]   = useState(210);
  const [problemVisible, setProblemVisible] = useState(true);
  const [resultVisible,  setResultVisible]  = useState(true);

  const dragH = useRef<{ startX: number; startW: number } | null>(null);
  const dragV = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragH.current) {
        const { startX, startW } = dragH.current;
        const dx = e.clientX - startX;
        setProblemWidth(Math.max(200, Math.min(700, startW + dx)));
      }
      if (dragV.current) {
        const { startY, startH } = dragV.current;
        const dy = startY - e.clientY;
        setResultHeight(Math.max(80, Math.min(480, startH + dy)));
      }
    };
    const onUp = () => { dragH.current = null; dragV.current = null; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let retryId: ReturnType<typeof setTimeout> | null = null;

    const fetchStatus = () => {
      authedRequest<SessionInfo>(
        `/api/sessions/link/${sessionLink}/lobby-status`,
        getTokenRef.current,
      )
        .then(s => {
          if (!active) return;
          setSession(s);

          const q1 = s.question1;
          const q2 = s.question2;

          if (q1 && q2) {
            setQuestions([q1, q2]);

            if (!codeInitialised.current) {
              codeInitialised.current = true;
              const langKey1 = s.lang_round1 ?? "python";
              const lang1 = (Object.entries(LANG_KEY).find(([, v]) => v === langKey1)?.[0] as Language | undefined) ?? "Python";
              setLanguage(lang1);
              const code1 = s.code_round1 ?? (q1.starter_code[langKey1] ?? STARTER_CODE[lang1]);
              const langKey2 = s.lang_round2 ?? "python";
              const lang2 = (Object.entries(LANG_KEY).find(([, v]) => v === langKey2)?.[0] as Language | undefined) ?? "Python";
              const code2 = s.code_round2 ?? (q2.starter_code[langKey2] ?? STARTER_CODE[lang2]);
              setCodeByRound([code1, code2]);
            }
          } else {
            // Questions not yet assigned — retry in 2s
            if (active) retryId = setTimeout(fetchStatus, 2000);
          }
        })
        .catch(err => { if (active) setError(err.message); });
    };

    fetchStatus();
    return () => {
      active = false;
      if (retryId) clearTimeout(retryId);
    };
  }, [sessionLink]); // eslint-disable-line react-hooks/exhaustive-deps

  // WebSocket — real-time code sync between participants
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || "https://10.0.0.226:4000")
      .replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws/session/${sessionLink}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as {
          type: string; code: string; round: number; language?: string;
          sender?: string; text?: string;
        };
        if (msg.type === "code_update") {
          setCodeByRound(prev => {
            const next: [string, string] = [prev[0], prev[1]];
            next[msg.round - 1] = msg.code;
            return next;
          });
          if (msg.language) {
            const lang = (Object.entries(LANG_KEY).find(([, v]) => v === msg.language)?.[0]) as Language | undefined;
            if (lang) setLanguage(lang);
          }
        }
        // Capture chat messages into the transcript
        if (msg.type === "chat_message" && msg.sender && msg.text) {
          const ts = new Date().toLocaleTimeString();
          transcriptRef.current.push(`[${ts}] ${msg.sender}: ${msg.text}`);
        }
        // Partner pressed "Ready for Round 2"
        if (msg.type === "ready_round2") {
          setPartnerReadyForR2(true);
        }
        // Partner disconnected — session is over for us too
        if (msg.type === "participant_left") {
          setPartnerLeft(true);
          // Trigger the feedback flow immediately
          authedRequest<{ given: Record<string, unknown> | null }>(
            `/api/sessions/link/${sessionLink}/feedback`,
            getTokenRef.current,
          )
            .then(data => setFeedbackState(data.given ? "already_done" : "form"))
            .catch(() => setFeedbackState("form"));
        }
      } catch { /* malformed message */ }
    };

    return () => { ws.close(); wsRef.current = null; };
  }, [sessionLink]);

  // ── Debounced code save (2s after interviewee stops typing) ───────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!session || !isIntervieweeRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const r = roundRef.current;
      authedRequest(
        `/api/sessions/link/${sessionLink}/save-code`,
        getTokenRef.current,
        {
          method: "PATCH",
          body: JSON.stringify({ round: r, code: codeByRound[r - 1], lang: LANG_KEY[language] }),
        },
      ).catch(() => {});
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [codeByRound, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: elapsed from started_at anchor ────────────────────────────────
  const naturalElapsed = session?.started_at
    ? Math.floor((now - new Date(session.started_at).getTime()) / 1000)
    : 0;

  // If both players clicked "Ready for Round 2" before the timer ran out,
  // act as if ROUND_SECS seconds elapsed at the moment they both agreed.
  const elapsed = forcedR2At !== null && naturalElapsed < ROUND_SECS
    ? ROUND_SECS + Math.max(0, Math.floor((now - forcedR2At) / 1000))
    : naturalElapsed;

  // ── Derived: round, roles, current question ────────────────────────────────
  const round: 1 | 2         = elapsed < ROUND_SECS ? 1 : 2;
  const roundElapsed          = round === 1 ? elapsed : elapsed - ROUND_SECS;
  const roundRemaining        = Math.max(0, ROUND_SECS - roundElapsed);
  const sessionDone           = elapsed >= ROUND_SECS * 2;

  // Round 1: host = interviewee, guest = interviewer
  // Round 2: host = interviewer, guest = interviewee
  const isInterviewee: boolean = session
    ? (session.is_host ? round === 1 : round === 2)
    : true;

  // Keep refs in sync so debounced effects always read fresh values
  isIntervieweeRef.current = isInterviewee;
  roundRef.current         = round;

  // ── Both players ready → advance to round 2 ──────────────────────────────
  useEffect(() => {
    if (myReadyForR2 && partnerReadyForR2 && forcedR2At === null && round === 1) {
      setForcedR2At(Date.now());
      // Clear test results so round-2 question starts fresh
      setTestResults(null);
      setIsSubmitRun(false);
    }
  }, [myReadyForR2, partnerReadyForR2, forcedR2At, round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset test panel when round changes naturally (timer flip)
  const prevRoundRef = useRef<1 | 2>(1);
  useEffect(() => {
    if (round !== prevRoundRef.current) {
      prevRoundRef.current = round;
      setTestResults(null);
      setIsSubmitRun(false);
    }
  }, [round]);

  // Mark session completed in DB when timer runs out, THEN check feedback state
  const completeCalledRef = useRef(false);
  useEffect(() => {
    if (!sessionDone || !session || completeCalledRef.current) return;
    completeCalledRef.current = true;
    // Call complete first, then—regardless of outcome—check feedback
    authedRequest(
      `/api/sessions/link/${sessionLink}/complete`,
      getTokenRef.current,
      { method: "POST" },
    )
      .catch(() => {}) // session may already be finalised; that's fine
      .finally(() => {
        authedRequest<{ given: Record<string, unknown> | null }>(
          `/api/sessions/link/${sessionLink}/feedback`,
          getTokenRef.current,
        )
          .then(data => setFeedbackState(data.given ? "already_done" : "form"))
          .catch(() => setFeedbackState("form"));
      });
  }, [sessionDone, session, sessionLink]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQuestion = questions[round - 1] ?? null;
  const currentCode     = codeByRound[round - 1];
  const submitted       = submittedRounds[round - 1];

  const myName    = session ? (session.is_host ? session.host_name : session.guest_name) ?? "You"    : "You";
  const theirName = session ? (session.is_host ? session.guest_name : session.host_name) ?? "Partner" : "Partner";

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCodeChange = (value: string | undefined) => {
    if (!isInterviewee) return;
    const newCode = value ?? "";
    setCodeByRound(prev => {
      const next: [string, string] = [prev[0], prev[1]];
      next[round - 1] = newCode;
      return next;
    });
    wsRef.current?.send(JSON.stringify({
      type: "code_update",
      code: newCode,
      round,
      language: LANG_KEY[language],
    }));
  };

  const handleLanguageChange = (lang: Language) => {
    if (!isInterviewee) return;
    setLanguage(lang);
    const q = questions[round - 1];
    const newCode = q
      ? (q.starter_code[LANG_KEY[lang]] ?? STARTER_CODE[lang])
      : STARTER_CODE[lang];
    setCodeByRound(prev => {
      const next: [string, string] = [prev[0], prev[1]];
      next[round - 1] = newCode;
      return next;
    });
    wsRef.current?.send(JSON.stringify({
      type: "code_update",
      code: newCode,
      round,
      language: LANG_KEY[lang],
    }));
  };

  const handleReadyForRound2 = () => {
    if (myReadyForR2) return; // already clicked
    setMyReadyForR2(true);
    wsRef.current?.send(JSON.stringify({ type: "ready_round2" }));
  };

  const handleRunCode = async () => {
    if (!currentQuestion || running) return;
    setRunning(true);
    setTestResults(null);
    setIsSubmitRun(false);
    setActiveTab("Test Cases");
    try {
      const data = await authedRequest<{ results: TestResult[]; stderr?: string }>(
        "/api/execute",
        getTokenRef.current,
        {
          method: "POST",
          body: JSON.stringify({
            question_slug: currentQuestion.slug,
            language:      LANG_KEY[language],
            code:          currentCode,
            mode:          "run",
          }),
        },
      );
      setTestResults(data.results ?? []);
      setLastRun("just now");
    } catch {
      setTestResults([]);
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuestion || running || submitted) return;
    setRunning(true);
    setTestResults(null);
    setIsSubmitRun(true);
    setActiveTab("Test Cases");
    try {
      const data = await authedRequest<{ results: TestResult[]; stderr?: string }>(
        "/api/execute",
        getTokenRef.current,
        {
          method: "POST",
          body: JSON.stringify({
            question_slug: currentQuestion.slug,
            language:      LANG_KEY[language],
            code:          currentCode,
            mode:          "submit",
          }),
        },
      );
      setTestResults(data.results ?? []);
      setSubmittedRounds(prev => {
        const next: [boolean, boolean] = [prev[0], prev[1]];
        next[round - 1] = true;
        return next;
      });
      setLastRun("just now");
    } catch {
      setTestResults([]);
    } finally {
      setRunning(false);
    }
  };

  const FEEDBACK_CATEGORIES = [
    { key: "rating_coding",          label: "Implementing / Coding the Solution",   desc: "How well did they translate the approach into working code?" },
    { key: "rating_explaining",      label: "Explaining the Solution",              desc: "How clearly did they articulate their reasoning?" },
    { key: "rating_navigating",      label: "Navigating to the Solution",           desc: "How effectively did they approach and explore the problem?" },
    { key: "rating_followups",       label: "Asking Follow-up Questions",           desc: "How insightful were their probing questions?" },
    { key: "rating_communication",   label: "Communication & Clarity",              desc: "How clear and professional was their overall communication?" },
    { key: "rating_problem_solving", label: "Problem-Solving Approach",             desc: "How structured and methodical was their thinking?" },
  ] as const;

  const allRated = FEEDBACK_CATEGORIES.every(c => !!feedbackRatings[c.key]);

  // ── AI feedback trigger ────────────────────────────────────────────────────
  const triggerAiFeedback = async (intervieweeRound: 1 | 2) => {
    setAiFeedbackRound(intervieweeRound);
    setAiFeedbackState("loading");
    const transcript = transcriptRef.current.join("\n");
    try {
      const data = await authedRequest<{ feedback: Record<string, unknown> }>(
        `/api/sessions/link/${sessionLink}/ai-feedback`,
        getTokenRef.current,
        {
          method: "POST",
          body: JSON.stringify({ round: intervieweeRound, transcript }),
        },
      );
      setAiFeedbackData(data.feedback);
      setAiFeedbackState("done");
    } catch {
      setAiFeedbackState("error");
    }
  };

  // Which round was the current user interviewee? (host=R1, guest=R2)
  const myIntervieweeRound: 1 | 2 = session ? (session.is_host ? 1 : 2) : 1;

  const handleFeedbackSubmit = async () => {
    if (!allRated) return;
    setFeedbackState("submitting");
    try {
      await authedRequest(
        `/api/sessions/link/${sessionLink}/feedback`,
        getTokenRef.current,
        {
          method: "POST",
          body: JSON.stringify({ ...feedbackRatings, comments: feedbackComments || null }),
        },
      );
      setFeedbackState("done");
      // Trigger AI feedback for the user's interviewee round
      triggerAiFeedback(myIntervieweeRound);
    } catch {
      setFeedbackState("form");
      alert("Failed to submit feedback. Please try again.");
    }
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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--background)", overflow: "hidden" }}>

      {/* ── Header ── */}
      <header style={{
        height: 52, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.25rem",
        background: "rgba(13,15,20,0.97)", borderBottom: "1px solid var(--border)",
        zIndex: 10, gap: "1rem",
      }}>
        {/* Left: brand + round badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <div style={{
            width: 26, height: 26, background: "var(--primary)", borderRadius: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "0.72rem", fontWeight: 800,
          }}>IR</div>
          <span style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
            InterviewRamp
          </span>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, color: "#a78bfa",
            background: "#1e1a2e", border: "1px solid #4c1d95",
            padding: "2px 9px", borderRadius: "999px",
          }}>
            {sessionDone ? "Session Complete" : `Round ${round} of 2`}
          </span>
        </div>

        {/* Centre: role badges + countdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, justifyContent: "center" }}>
          {/* My role */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{myName}</span>
            <RoleBadge role={isInterviewee ? "Interviewee" : "Interviewer"} isMe />
          </div>
          <span style={{ color: "var(--border)", fontSize: "0.8rem" }}>vs</span>
          {/* Partner role */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>{theirName}</span>
            <RoleBadge role={isInterviewee ? "Interviewer" : "Interviewee"} isMe={false} />
          </div>
          {/* Round countdown */}
          {!sessionDone && (
            <div style={{
              padding: "3px 12px", borderRadius: "999px",
              background: roundRemaining < 120 ? "#2d0e0e" : "var(--card)",
              border: `1px solid ${roundRemaining < 120 ? "#7f1d1d" : "var(--border)"}`,
              fontSize: "0.78rem", fontWeight: 700,
              color: roundRemaining < 120 ? "#f87171" : "var(--foreground)",
              fontFamily: "monospace", letterSpacing: "0.04em",
            }}>
              {fmtTime(roundRemaining)}
            </div>
          )}
        </div>

        {/* Right: connected + round-advance + exit */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {/* Connected dot */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: "0.76rem", color: "#22c55e", fontWeight: 600 }}>Connected</span>
          </div>

          {/* "Ready for Round 2" — only visible in round 1 and before session ends */}
          {round === 1 && !sessionDone && (
            <button
              onClick={handleReadyForRound2}
              disabled={myReadyForR2}
              title={myReadyForR2 ? `Waiting for ${theirName}…` : "Signal you're ready to start Round 2"}
              style={{
                fontSize: "0.72rem", fontWeight: 700,
                padding: "4px 11px", borderRadius: "6px",
                border: `1px solid ${partnerReadyForR2 && !myReadyForR2 ? "#f59e0b" : myReadyForR2 ? "var(--border)" : "#0369a1"}`,
                background: partnerReadyForR2 && !myReadyForR2 ? "#1c1200" : myReadyForR2 ? "transparent" : "#0c1f2e",
                color: partnerReadyForR2 && !myReadyForR2 ? "#f59e0b" : myReadyForR2 ? "var(--muted)" : "#38bdf8",
                cursor: myReadyForR2 ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "0.35rem",
                animation: partnerReadyForR2 && !myReadyForR2 ? "pulse-border 1.2s infinite" : "none",
              }}
            >
              {myReadyForR2 ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Waiting for {theirName}…
                </>
              ) : partnerReadyForR2 ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
                  {theirName} is ready! →
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  Ready for Round 2
                </>
              )}
            </button>
          )}

          {/* Exit button — always shows confirmation */}
          <button
            onClick={() => setShowExitConfirm(true)}
            style={{
              fontSize: "0.72rem", color: partnerLeft ? "#f87171" : "var(--muted)",
              padding: "3px 10px", borderRadius: "6px",
              border: `1px solid ${partnerLeft ? "#7f1d1d" : "var(--border)"}`,
              background: partnerLeft ? "#2d0e0e" : "transparent", cursor: "pointer",
            }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* ── Video row ── */}
      <VideoConferenceRow
        sessionLink={sessionLink}
        myName={myName}
        theirName={theirName}
        myRole={isInterviewee ? "Interviewee" : "Interviewer"}
        theirRole={isInterviewee ? "Interviewer" : "Interviewee"}
        getToken={getToken}
      />

      {/* ── Workspace ── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* ── Problem panel ── */}
        {problemVisible && (
        <div style={{
          width: problemWidth, flexShrink: 0,
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                {currentQuestion ? (
                  <DifficultyBadge difficulty={currentQuestion.difficulty} />
                ) : (
                  <span style={{ fontSize: "0.68rem", color: "var(--muted)" }}>Loading…</span>
                )}
              </div>
              <button
                onClick={() => setProblemVisible(false)}
                title="Close problem panel"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem", lineHeight: 1, padding: "2px 4px", borderRadius: "4px" }}
              >
                ×
              </button>
            </div>
            <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
              {currentQuestion ? currentQuestion.title : "Loading question…"}
            </h2>
          </div>

          {/* Scrollable problem body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.1rem", fontSize: "0.82rem", lineHeight: 1.7, color: "var(--foreground)" }}>
            {!currentQuestion ? (
              <p style={{ color: "var(--muted)" }}>Fetching question…</p>
            ) : (
            <>
            <ProbSection title="Description">
              <p style={{ whiteSpace: "pre-wrap" }}>{currentQuestion.description}</p>
            </ProbSection>

            {currentQuestion.examples.map((ex, i) => (
              <ProbSection key={i} title={`Example ${i + 1}`}>
                <ExampleBlock
                  lines={[
                    ["Input",  ex.input],
                    ["Output", ex.output],
                    ...(ex.explanation ? [["Explanation", ex.explanation] as [string, string]] : []),
                  ]}
                />
              </ProbSection>
            ))}

            <ProbSection title="Constraints">
              <ul style={{ paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {currentQuestion.constraints.map((c, i) => (
                  <li key={i} style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                    <code style={{ ...codeStyle, fontSize: "0.76rem" }}>{c}</code>
                  </li>
                ))}
              </ul>
            </ProbSection>

            {currentQuestion.notes && (
              <ProbSection title="Notes">
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", lineHeight: 1.65 }}>
                  {currentQuestion.notes}
                </p>
              </ProbSection>
            )}
            </>
            )}
          </div>
        </div>
        )}

        {/* ── Horizontal resize handle ── */}
        {problemVisible && (
          <div
            onMouseDown={e => { dragH.current = { startX: e.clientX, startW: problemWidth }; e.preventDefault(); }}
            style={{ width: 4, flexShrink: 0, cursor: "col-resize", background: "var(--border)", transition: "background 0.15s" }}
            className="h-resizer"
          />
        )}

        {/* ── Collapsed problem re-open strip ── */}
        {!problemVisible && (
          <div
            onClick={() => setProblemVisible(true)}
            title="Show problem"
            style={{
              width: 24, flexShrink: 0,
              borderRight: "1px solid var(--border)",
              background: "var(--card)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <span style={{
              writingMode: "vertical-rl", transform: "rotate(180deg)",
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
              color: "var(--muted)", userSelect: "none",
            }}>
              PROBLEM
            </span>
          </div>
        )}

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
                disabled={!isInterviewee}
                onChange={e => handleLanguageChange(e.target.value as Language)}
                style={{
                  background: "var(--card-hover)", border: "1px solid var(--border)",
                  color: isInterviewee ? "var(--foreground)" : "var(--muted)",
                  borderRadius: "6px", padding: "3px 8px",
                  fontSize: "0.78rem", fontWeight: 600,
                  cursor: isInterviewee ? "pointer" : "not-allowed", outline: "none",
                  opacity: isInterviewee ? 1 : 0.5,
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              {!isInterviewee && (
                <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontStyle: "italic" }}>
                  read-only
                </span>
              )}
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

          {/* Monaco editor */}
          <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
            <Editor
              height="100%"
              language={MONACO_LANGUAGE[language]}
              value={currentCode}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                tabSize: language === "Python" ? 4 : 2,
                renderLineHighlight: "line",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 12, bottom: 12 },
                scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
                readOnly: !isInterviewee,
                readOnlyMessage: { value: "You are the interviewer — code is read-only this round." },
              }}
            />
            {/* Interviewer overlay label */}
            {!isInterviewee && (
              <div style={{
                position: "absolute", top: 8, right: 12,
                background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
                border: "1px solid var(--border)", borderRadius: "6px",
                padding: "3px 10px", fontSize: "0.68rem", fontWeight: 700,
                color: "var(--muted)", pointerEvents: "none",
              }}>
                👁 Watching live
              </div>
            )}
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
                disabled={running || !isInterviewee}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "7px",
                  border: "1px solid var(--border)", background: "var(--card-hover)",
                  color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 600,
                  cursor: (running || !isInterviewee) ? "not-allowed" : "pointer",
                  opacity: (running || !isInterviewee) ? 0.4 : 1,
                  display: "flex", alignItems: "center", gap: "0.35rem",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                {running ? "Running…" : "Run Code"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={running || submitted || !isInterviewee}
                style={{
                  padding: "0.4rem 1rem", borderRadius: "7px",
                  border: "none",
                  background: submitted ? "#0d2b1e" : "var(--primary)",
                  color: submitted ? "#4ade80" : "white",
                  fontSize: "0.8rem", fontWeight: 700,
                  cursor: (running || submitted || !isInterviewee) ? "not-allowed" : "pointer",
                  opacity: (running || !isInterviewee) ? 0.4 : 1,
                }}
              >
                {submitted ? "✓ Submitted" : "Submit"}
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {!resultVisible && (
                <button
                  onClick={() => setResultVisible(true)}
                  style={{ ...toolBtnStyle, border: "1px solid var(--border)", padding: "3px 8px" }}
                >
                  Show Results
                </button>
              )}
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {lastRun ? `Last run: ${lastRun}` : "No runs yet"}
              </span>
            </div>
          </div>

          {/* Vertical resize handle + Results panel */}
          {resultVisible && (
          <>
            <div
              onMouseDown={e => { dragV.current = { startY: e.clientY, startH: resultHeight }; e.preventDefault(); }}
              style={{ height: 4, flexShrink: 0, cursor: "row-resize", background: "var(--border)", transition: "background 0.15s" }}
              className="v-resizer"
            />
            <div style={{
              flexShrink: 0, height: resultHeight,
              background: "#0a0c12",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
                <div style={{ flex: 1 }}>
                  <TabBar
                    tabs={["Test Cases", "Console", "Performance"]}
                    active={activeTab}
                    onChange={setActiveTab}
                  />
                </div>
                <button
                  onClick={() => setResultVisible(false)}
                  title="Close results panel"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1rem", lineHeight: 1, padding: "0 0.75rem", alignSelf: "stretch" }}
                >
                  ×
                </button>
              </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "0.6rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeTab === "Test Cases" && (
                <>
                  {/* Results header row */}
                  {testResults !== null && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)" }}>
                          {isSubmitRun ? "Submit Results" : "Run Results"}
                        </span>
                        <span style={{
                          fontSize: "0.7rem", fontWeight: 700,
                          color: testResults.every(r => r.passed) ? "#4ade80" : "#f87171",
                          background: testResults.every(r => r.passed) ? "#0d2b1e" : "#2d0e0e",
                          border: `1px solid ${testResults.every(r => r.passed) ? "#166534" : "#7f1d1d"}`,
                          padding: "1px 8px", borderRadius: "999px",
                        }}>
                          {testResults.filter(r => r.passed).length}/{testResults.length} passed
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Show real results if available, else show pending cards */}
                  {testResults !== null ? (
                    testResults.length === 0 ? (
                      <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        No results — check your code for errors.
                      </p>
                    ) : (
                      testResults.map((r, i) => (
                        <TestCard
                          key={i}
                          label={r.label}
                          input={r.hidden ? "" : r.got}
                          expected={r.hidden ? "" : r.expected}
                          got={r.got}
                          passed={r.passed}
                          hidden={r.hidden}
                        />
                      ))
                    )
                  ) : (
                    currentQuestion
                      ? currentQuestion.test_cases.map((tc, i) => (
                          <TestCard
                            key={i}
                            label={tc.label}
                            input={tc.input_display}
                            expected={tc.expected_display}
                            got=""
                            passed={false}
                            pending
                          />
                        ))
                      : <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Loading test cases…</p>
                  )}
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
          </>
          )}

        </div>
      </div>

      <style>{sessionStyles}</style>

      {/* ── Exit confirmation modal ── */}
      {showExitConfirm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(7,8,13,0.85)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}>
          <div style={{
            width: "100%", maxWidth: 400,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "14px", padding: "1.75rem 2rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "8px",
                background: "#2d0e0e", border: "1px solid #7f1d1d",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "var(--foreground)" }}>
                {sessionDone || partnerLeft ? "Leave session?" : "End session early?"}
              </h3>
            </div>
            <p style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
              {partnerLeft
                ? `${theirName} has already left. You'll be taken to the feedback form before returning to the schedule.`
                : sessionDone
                ? "Your session is complete. You'll be taken to the feedback form before returning to the schedule."
                : "Leaving early will end the session for both participants. Your code is saved. You'll need to fill out a feedback form before leaving."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              {!partnerLeft && (
                <button
                  onClick={() => setShowExitConfirm(false)}
                  disabled={exitLoading}
                  style={{
                    padding: "0.45rem 1.1rem", borderRadius: "7px",
                    border: "1px solid var(--border)", background: "transparent",
                    color: "var(--muted)", fontSize: "0.83rem", fontWeight: 600,
                    cursor: exitLoading ? "not-allowed" : "pointer",
                    opacity: exitLoading ? 0.5 : 1,
                  }}
                >
                  Stay
                </button>
              )}
              <button
                disabled={exitLoading}
                onClick={async () => {
                  setExitLoading(true);
                  // Call early-exit if session is still running
                  if (!sessionDone) {
                    try {
                      await authedRequest(
                        `/api/sessions/link/${sessionLink}/early-exit`,
                        getTokenRef.current,
                        { method: "POST" },
                      );
                    } catch { /* already completed is fine */ }
                  }
                  // Check feedback status then show form
                  setShowExitConfirm(false);
                  setExitLoading(false);
                  try {
                    const fb = await authedRequest<{ given: Record<string, unknown> | null }>(
                      `/api/sessions/link/${sessionLink}/feedback`,
                      getTokenRef.current,
                    );
                    setFeedbackState(fb.given ? "already_done" : "form");
                  } catch {
                    setFeedbackState("form");
                  }
                }}
                style={{
                  padding: "0.45rem 1.3rem", borderRadius: "7px",
                  border: "none", background: exitLoading ? "#4b1313" : "#7f1d1d",
                  color: "#fca5a5", fontSize: "0.83rem", fontWeight: 700,
                  cursor: exitLoading ? "not-allowed" : "pointer",
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                }}
              >
                {exitLoading ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    Ending…
                  </>
                ) : (partnerLeft || sessionDone) ? "Go to Feedback" : "End & Give Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Partner-left notification banner (shown once, auto-dismissed) ── */}
      {partnerLeft && feedbackState === "idle" && !partnerLeftAckd && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 300, maxWidth: 480, width: "calc(100% - 2rem)",
          background: "#1c0e00", border: "1px solid #f59e0b",
          borderRadius: "12px", padding: "1rem 1.25rem",
          display: "flex", alignItems: "flex-start", gap: "0.75rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          animation: "slideUp 0.3s ease",
        }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            borderRadius: "8px", background: "#2d1a00", border: "1px solid #f59e0b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.2rem" }}>
              {theirName} has left the session
            </div>
            <p style={{ fontSize: "0.78rem", color: "#d97706", margin: 0, lineHeight: 1.5 }}>
              The session has ended. Please click <strong style={{ color: "#fbbf24" }}>Exit</strong> to submit your feedback and return to the schedule.
            </p>
          </div>
          <button
            onClick={() => setPartnerLeftAckd(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d97706", fontSize: "1.1rem", lineHeight: 1, flexShrink: 0, padding: "2px" }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Feedback overlay ── */}
      {(feedbackState === "form" || feedbackState === "submitting" || feedbackState === "done" || feedbackState === "already_done") && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(7, 8, 13, 0.92)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
        }}>
          <div style={{
            width: "100%", maxWidth: 560,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "16px", overflow: "hidden",
            maxHeight: "90vh", display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem 1rem",
              borderBottom: "1px solid var(--border)",
              background: "linear-gradient(135deg, #0f1117 0%, #13161e 100%)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.7rem", fontWeight: 800 }}>IR</div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Session Complete</span>
              </div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em", margin: 0 }}>
                {feedbackState === "done" || feedbackState === "already_done"
                  ? "Feedback Submitted"
                  : `Rate ${theirName}`}
              </h2>
              {feedbackState === "form" || feedbackState === "submitting" ? (
                <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.3rem" }}>
                  Rate your partner as the <strong style={{ color: "var(--foreground)" }}>interviewer</strong> (Round 1) and <strong style={{ color: "var(--foreground)" }}>interviewee</strong> (Round 2). Your feedback is anonymous until both submit.
                </p>
              ) : null}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>

              {(feedbackState === "done" || feedbackState === "already_done") && (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>✓</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.4rem" }}>
                    {feedbackState === "already_done" ? "You've already submitted feedback" : "Thank you for your feedback!"}
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", maxWidth: 340, margin: "0 auto 1.5rem" }}>
                    Your rating for <strong style={{ color: "var(--foreground)" }}>{theirName}</strong> has been recorded.
                    {aiFeedbackState === "idle" && " Click below to get your AI interview feedback."}
                    {aiFeedbackState === "loading" && " Generating your AI feedback — this takes a few seconds…"}
                    {aiFeedbackState === "done" && " Scroll down to view your AI-generated feedback."}
                    {aiFeedbackState === "error" && " AI feedback unavailable right now."}
                  </p>
                  {aiFeedbackState === "idle" && (
                    <button
                      onClick={() => triggerAiFeedback(myIntervieweeRound)}
                      style={{
                        padding: "0.6rem 1.6rem", borderRadius: "8px",
                        background: "var(--primary)", color: "white",
                        fontSize: "0.85rem", fontWeight: 700, border: "none", cursor: "pointer",
                      }}
                    >
                      Get AI Feedback
                    </button>
                  )}
                  {aiFeedbackState === "loading" && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", color: "var(--muted)", fontSize: "0.83rem" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 0.8s linear infinite" }}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                      </svg>
                      Analysing your performance…
                    </div>
                  )}
                  {aiFeedbackState === "error" && (
                    <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "1rem" }}>
                      Could not generate AI feedback. You can try again later from your session history.
                    </div>
                  )}
                  {aiFeedbackState !== "done" && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <Link
                        href="/schedule"
                        style={{
                          display: "inline-block",
                          padding: "0.6rem 1.6rem", borderRadius: "8px",
                          background: aiFeedbackState === "loading" ? "var(--border)" : "var(--card)",
                          border: "1px solid var(--border)",
                          color: aiFeedbackState === "loading" ? "var(--muted)" : "var(--foreground)",
                          fontSize: "0.85rem", fontWeight: 600, textDecoration: "none",
                          pointerEvents: aiFeedbackState === "loading" ? "none" : "auto",
                        }}
                      >
                        Back to Schedule
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {(feedbackState === "form" || feedbackState === "submitting") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {FEEDBACK_CATEGORIES.map(cat => (
                    <div key={cat.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--foreground)" }}>{cat.label}</span>
                        {feedbackRatings[cat.key] && (
                          <span style={{ fontSize: "0.72rem", color: "var(--primary-light)", fontWeight: 600 }}>
                            {["", "Poor", "Fair", "Good", "Great", "Excellent"][feedbackRatings[cat.key]]}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.5rem" }}>{cat.desc}</p>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => setFeedbackRatings(prev => ({ ...prev, [cat.key]: star }))}
                            disabled={feedbackState === "submitting"}
                            style={{
                              background: "transparent", border: "none", cursor: "pointer",
                              padding: "2px 1px", fontSize: "1.6rem", lineHeight: 1,
                              color: (feedbackRatings[cat.key] ?? 0) >= star ? "#f59e0b" : "var(--border)",
                              transition: "color 0.12s, transform 0.1s",
                              transform: (feedbackRatings[cat.key] ?? 0) >= star ? "scale(1.1)" : "scale(1)",
                            }}
                            aria-label={`${star} star${star !== 1 ? "s" : ""} for ${cat.label}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div>
                    <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--foreground)", display: "block", marginBottom: "0.4rem" }}>
                      Additional Comments <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
                    </label>
                    <textarea
                      value={feedbackComments}
                      onChange={e => setFeedbackComments(e.target.value)}
                      disabled={feedbackState === "submitting"}
                      placeholder={`Share specific observations about ${theirName}'s performance…`}
                      rows={4}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        background: "var(--background)", border: "1px solid var(--border)",
                        borderRadius: "8px", padding: "0.65rem 0.85rem",
                        color: "var(--foreground)", fontSize: "0.82rem",
                        resize: "vertical", outline: "none", lineHeight: 1.6,
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {(feedbackState === "form" || feedbackState === "submitting") && (
              <div style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexShrink: 0, background: "var(--card)",
              }}>
                <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                  {allRated ? "All categories rated — ready to submit" : `${FEEDBACK_CATEGORIES.length - FEEDBACK_CATEGORIES.filter(c => !!feedbackRatings[c.key]).length} categories remaining`}
                </span>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  {!partnerLeft && (
                    <button
                      onClick={() => {
                        // Trigger AI feedback in background, then navigate
                        triggerAiFeedback(myIntervieweeRound);
                        setFeedbackState("done");
                      }}
                      style={{ padding: "0.45rem 1rem", borderRadius: "7px", border: "1px solid var(--border)", color: "var(--muted)", fontSize: "0.8rem", fontWeight: 600, background: "transparent", cursor: "pointer" }}
                    >
                      Skip
                    </button>
                  )}
                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={!allRated || feedbackState === "submitting"}
                    style={{
                      padding: "0.45rem 1.4rem", borderRadius: "7px",
                      border: "none", background: allRated ? "var(--primary)" : "var(--border)",
                      color: allRated ? "white" : "var(--muted)",
                      fontSize: "0.8rem", fontWeight: 700,
                      cursor: allRated ? "pointer" : "not-allowed",
                      transition: "background 0.15s",
                    }}
                  >
                    {feedbackState === "submitting" ? "Submitting…" : "Submit Feedback"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI Feedback Overlay ── */}
      {aiFeedbackState === "done" && aiFeedbackData && (() => {
        const fb = aiFeedbackData as any;
        const score = fb.overall_score as number;
        const categories = [
          { key: "code_quality",    label: "Code Quality",      icon: "⌨️" },
          { key: "problem_solving", label: "Problem Solving",   icon: "🧩" },
          { key: "communication",   label: "Communication",     icon: "💬" },
        ] as const;
        const scoreColor = score >= 8 ? "#4ade80" : score >= 6 ? "#fbbf24" : "#f87171";
        const scoreBg    = score >= 8 ? "#0d2b1e" : score >= 6 ? "#1c1500" : "#2d0e0e";

        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 150,
            background: "rgba(5,6,10,0.96)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            overflowY: "auto", padding: "2rem 1rem",
          }}>
            <div style={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Header card */}
              <div style={{
                background: "linear-gradient(135deg, #0d0f1a 0%, #13111f 50%, #0d1520 100%)",
                border: "1px solid #2d2a4a",
                borderRadius: "18px", padding: "2rem",
                position: "relative", overflow: "hidden",
              }}>
                {/* Glow */}
                <div style={{
                  position: "absolute", top: -40, right: -40, width: 220, height: 220,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${scoreColor}18 0%, transparent 70%)`,
                  pointerEvents: "none",
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                  <div style={{ width: 28, height: 28, background: "var(--primary)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.7rem", fontWeight: 800 }}>IR</div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>AI Interview Feedback · Round {aiFeedbackRound}</span>
                </div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.03em", margin: "0 0 0.5rem" }}>
                  Your Performance Report
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 1.5rem", maxWidth: 500, lineHeight: 1.65 }}>
                  {fb.summary as string}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    background: scoreBg, border: `1px solid ${scoreColor}44`,
                    borderRadius: "12px", padding: "0.75rem 1.25rem",
                  }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: scoreColor, fontFamily: "monospace" }}>{score}</span>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Overall Score</div>
                      <div style={{ fontSize: "0.72rem", color: scoreColor, fontWeight: 600 }}>out of 10</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {categories.map(cat => {
                      const catData = fb[cat.key] as any;
                      const s = catData?.score as number;
                      const c2 = s >= 8 ? "#4ade80" : s >= 6 ? "#fbbf24" : "#f87171";
                      return (
                        <div key={cat.key} style={{
                          background: "var(--card)", border: "1px solid var(--border)",
                          borderRadius: "8px", padding: "0.5rem 0.75rem",
                          display: "flex", flexDirection: "column", alignItems: "center",
                        }}>
                          <span style={{ fontSize: "0.88rem" }}>{cat.icon}</span>
                          <span style={{ fontSize: "1rem", fontWeight: 800, color: c2, fontFamily: "monospace" }}>{s}</span>
                          <span style={{ fontSize: "0.6rem", color: "var(--muted)", fontWeight: 600, letterSpacing: "0.04em" }}>{cat.label.split(" ")[0].toUpperCase()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Strengths + Improvements */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ background: "#0a1f12", border: "1px solid #166534", borderRadius: "14px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#4ade80", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>✦ Strengths</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {(fb.strengths as string[]).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "#86efac", lineHeight: 1.5 }}>
                        <span style={{ color: "#4ade80", flexShrink: 0, marginTop: "0.1rem" }}>✓</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "#1c0f00", border: "1px solid #78350f", borderRadius: "14px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>▲ Areas to Improve</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {(fb.areas_for_improvement as string[]).map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", color: "#fde68a", lineHeight: 1.5 }}>
                        <span style={{ color: "#f59e0b", flexShrink: 0, marginTop: "0.1rem" }}>→</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category breakdowns */}
              {categories.map(cat => {
                const catData = fb[cat.key] as any;
                if (!catData) return null;
                const s = catData.score as number;
                const c2 = s >= 8 ? "#4ade80" : s >= 6 ? "#fbbf24" : "#f87171";
                const bg2 = s >= 8 ? "#0d2b1e" : s >= 6 ? "#1c1500" : "#2d0e0e";
                const bd2 = s >= 8 ? "#166534" : s >= 6 ? "#78350f" : "#7f1d1d";
                return (
                  <div key={cat.key} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{cat.icon}</span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--foreground)" }}>{cat.label}</span>
                      </div>
                      <div style={{ background: bg2, border: `1px solid ${bd2}`, borderRadius: "8px", padding: "2px 10px", fontSize: "0.82rem", fontWeight: 800, color: c2 }}>
                        {s} / 10
                      </div>
                    </div>
                    {/* Score bar */}
                    <div style={{ height: 6, background: "var(--border)", borderRadius: "999px", marginBottom: "0.85rem", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(s / 10) * 100}%`, background: c2, borderRadius: "999px", transition: "width 1s ease" }} />
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{catData.feedback as string}</p>
                  </div>
                );
              })}

              {/* Time Complexity */}
              {fb.time_complexity && (() => {
                const tc = fb.time_complexity as any;
                return (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>⏱</span>
                      <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--foreground)" }}>Time Complexity Analysis</span>
                      <span style={{ marginLeft: "auto", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                        background: tc.identified ? "#0d2b1e" : "#2d0e0e",
                        color: tc.identified ? "#4ade80" : "#f87171",
                        border: `1px solid ${tc.identified ? "#166534" : "#7f1d1d"}`,
                      }}>
                        {tc.identified ? "Identified ✓" : "Not Identified ✗"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.5rem 0.85rem" }}>
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Your Answer</div>
                        <code style={{ fontSize: "0.82rem", color: "var(--accent)", fontFamily: "monospace" }}>{tc.candidate_answer as string}</code>
                      </div>
                      <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.5rem 0.85rem" }}>
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Correct Answer</div>
                        <code style={{ fontSize: "0.82rem", color: "#4ade80", fontFamily: "monospace" }}>{tc.correct_answer as string}</code>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{tc.feedback as string}</p>
                  </div>
                );
              })()}

              {/* Study Topics */}
              <div style={{ background: "#0d0f1e", border: "1px solid #2d2a4a", borderRadius: "14px", padding: "1.25rem" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>📚 Recommended Study Topics</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {(fb.suggested_study_topics as string[]).map((t, i) => (
                    <span key={i} style={{
                      background: "#1e1a2e", border: "1px solid #4c1d95",
                      color: "#c4b5fd", fontSize: "0.78rem", fontWeight: 600,
                      padding: "4px 12px", borderRadius: "999px",
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Interviewer Tips */}
              {fb.interviewer_tips && (
                <div style={{ background: "#0a0f1a", border: "1px solid #1e3a5f", borderRadius: "14px", padding: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>💡</span>
                  <div>
                    <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.35rem" }}>Pro Tip for Next Interview</div>
                    <p style={{ fontSize: "0.84rem", color: "#bae6fd", lineHeight: 1.65, margin: 0 }}>{fb.interviewer_tips as string}</p>
                  </div>
                </div>
              )}

              {/* Footer CTA */}
              <div style={{ display: "flex", justifyContent: "center", paddingBottom: "1rem" }}>
                <Link
                  href="/schedule"
                  style={{
                    display: "inline-block",
                    padding: "0.7rem 2.5rem", borderRadius: "10px",
                    background: "var(--primary)", color: "white",
                    fontSize: "0.9rem", fontWeight: 700, textDecoration: "none",
                    boxShadow: "0 0 24px var(--primary)40",
                  }}
                >
                  Back to Schedule
                </Link>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Small sub-components ──────────────────────────────────────────────────────

function RoleBadge({ role, isMe }: { role: "Interviewer" | "Interviewee"; isMe: boolean }) {
  const isInterviewee = role === "Interviewee";
  return (
    <span style={{
      fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.04em",
      padding: "2px 8px", borderRadius: "999px",
      background: isInterviewee ? "#0d1f2b" : "#1a0d2b",
      color: isInterviewee ? "#38bdf8" : "#c084fc",
      border: `1px solid ${isInterviewee ? "#0369a1" : "#7c3aed"}`,
      ...(isMe ? { boxShadow: `0 0 6px ${isInterviewee ? "#0369a1" : "#7c3aed"}40` } : {}),
    }}>
      {role}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: "easy" | "medium" | "hard" }) {
  const styles: Record<string, { color: string; bg: string; border: string }> = {
    easy:   { color: "#4ade80", bg: "#0d2b1e", border: "#166534" },
    medium: { color: "#fbbf24", bg: "#1c1500", border: "#78350f" },
    hard:   { color: "#f87171", bg: "#2d0e0e", border: "#7f1d1d" },
  };
  const s = styles[difficulty];
  return (
    <span style={{
      fontSize: "0.68rem", fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      padding: "1px 8px", borderRadius: "999px",
      textTransform: "capitalize",
    }}>
      {difficulty}
    </span>
  );
}

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

  /* Resize handles */
  .h-resizer:hover, .h-resizer:active { background: #4f5b8a; }
  .v-resizer:hover, .v-resizer:active { background: #4f5b8a; }

  /* Partner-ready pulse on the Round 2 button */
  @keyframes pulse-border {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: #f59e0b; }
    50%       { box-shadow: 0 0 0 4px rgba(245,158,11,0.25); border-color: #fbbf24; }
  }

  /* Slide-up animation for notifications */
  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(16px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }

  /* Spinner animation for loading states */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;
