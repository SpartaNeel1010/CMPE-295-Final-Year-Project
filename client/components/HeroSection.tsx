export default function HeroSection() {
  return (
    <div className="hero">
      {/* ── Left: Copy ── */}
      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Introducing AI-Powered Interview Practice
          <span>→</span>
        </div>

        <h1 className="hero-title">
          Ace your next tech interview with{" "}
          <span>real mock sessions</span>
        </h1>

        <p className="hero-subtitle">
          Practice live coding interviews with peers and AI. Real LeetCode-style
          problems, collaborative coding environment, video calls, and
          AI-driven feedback — all in one place.
        </p>

        <div className="hero-cta">
          <a href="/signup" className="btn-hero-primary" id="hero-cta-primary">
            Start practicing free
          </a>
          <a href="#how-it-works" className="btn-hero-secondary" id="hero-cta-secondary">
            See how it works →
          </a>
        </div>
      </div>

      {/* ── Right: Mock UI window ── */}
      <div className="hero-visual">
        <div className="hero-mock-window">
          <div className="mock-window-bar">
            <span className="mock-dot mock-dot-red" />
            <span className="mock-dot mock-dot-yellow" />
            <span className="mock-dot mock-dot-green" />
            <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
              Interview Room · Live
            </span>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 600 }}>Connected</span>
            </span>
          </div>
          <div className="mock-window-content">
            {/* Problem statement */}
            <div style={{ background: "#1a1d27", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.8rem", lineHeight: 1.6, color: "#c8cdd8" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.25rem", color: "#e2e8f0" }}>
                📋 Two Sum — Easy
              </div>
              Given an array of integers <code style={{ background: "#2d3548", padding: "1px 4px", borderRadius: 3, color: "#a5b4fc" }}>nums</code> and an
              integer <code style={{ background: "#2d3548", padding: "1px 4px", borderRadius: 3, color: "#a5b4fc" }}>target</code>, return indices of
              two numbers that add up to target.
            </div>

            {/* Code snippet */}
            <div style={{ background: "#0f172a", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.7, color: "#94a3b8" }}>
              <span style={{ color: "#7c3aed" }}>def</span>{" "}
              <span style={{ color: "#38bdf8" }}>twoSum</span>
              <span style={{ color: "#e2e8f0" }}>(nums, target):</span>
              <br />
              {"  "}<span style={{ color: "#94a3b8" }}># your solution</span>
              <br />
              {"  "}<span style={{ color: "#7c3aed" }}>seen</span>
              <span style={{ color: "#e2e8f0" }}> = {}</span>
              <br />
              {"  "}<span style={{ color: "#7c3aed" }}>for</span>
              <span style={{ color: "#e2e8f0" }}> i, n </span>
              <span style={{ color: "#7c3aed" }}>in</span>
              <span style={{ color: "#e2e8f0" }}> enumerate(nums):</span>
              <br />
              {"    "}<span style={{ color: "#94a3b8", fontStyle: "italic" }}>▌</span>
            </div>

            {/* AI feedback card */}
            <div className="mock-feedback-card">
              <div className="mock-feedback-title">🤖 AI Feedback — Live</div>
              <div className="mock-feedback-row">
                <span className="mock-feedback-label">Problem solving</span>
                <div className="mock-stars">
                  {[...Array(4)].map((_, i) => <span key={i} className="mock-star">★</span>)}
                  <span className="mock-star" style={{ color: "#d1d5db" }}>★</span>
                </div>
              </div>
              <div className="mock-feedback-row">
                <span className="mock-feedback-label">Communication</span>
                <div className="mock-stars">
                  {[...Array(5)].map((_, i) => <span key={i} className="mock-star">★</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
