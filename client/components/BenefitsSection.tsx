const benefits = [
  {
    icon: "🧑‍💻",
    text: "Practice and receive AI feedback on both your technical problem-solving and behavioral communication skills.",
  },
  {
    icon: "🤝",
    text: "Match with serious, like-minded candidates who are actively improving their interview skills.",
  },
  {
    icon: "💡",
    text: "Deep dive into the most commonly asked questions in tech — from two-pointers to distributed system design.",
  },
];

const metrics = [
  { label: "Communication",      pct: "92%" },
  { label: "Problem Solving",    pct: "85%" },
  { label: "Code Quality",       pct: "78%" },
];

export default function BenefitsSection() {
  return (
    <section className="benefits-section" id="benefits">
      <div className="benefits-inner">
        {/* Copy */}
        <div>
          <div className="section-tag">Why practice?</div>
          <h2 className="section-title">Gain confidence and get real results</h2>
          <ul className="benefits-list">
            {benefits.map((b) => (
              <li key={b.text} className="benefits-item">
                <span className="benefits-dot">{b.icon}</span>
                <span className="benefits-item-text">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Visual — feedback report */}
        <div className="benefits-visual">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}>
              JS
            </div>
            <div>
              <div className="benefits-feedback-header">Feedback for your interview</div>
              <div className="benefits-feedback-sub">Product Management · May 16 at 10:00am</div>
            </div>
          </div>

          {metrics.map((m) => (
            <div key={m.label}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>{m.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.85rem" }}>
                <div className="benefits-bar-track" style={{ flex: 1 }}>
                  <div className="benefits-bar-fill" style={{ width: m.pct }} />
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--muted)", flexShrink: 0 }}>{m.pct}</span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: "0.75rem", padding: "0.9rem 1rem", background: "#1a2a1a", borderRadius: 10, fontSize: "0.82rem", color: "#86efac", lineHeight: 1.6 }}>
            <strong style={{ color: "#bbf7d0" }}>What went well</strong><br />
            Strong problem decomposition. Walked through edge cases proactively and communicated tradeoffs clearly before coding.
          </div>

          <div style={{ marginTop: "0.65rem", padding: "0.9rem 1rem", background: "#2a1a0a", borderRadius: 10, fontSize: "0.82rem", color: "#fcd34d", lineHeight: 1.6, borderLeft: "3px solid #f59e0b" }}>
            <strong style={{ color: "#fde68a" }}>Areas of improvement</strong><br />
            Optimize the brute-force to O(n) before writing code. Ask clarifying questions about constraints earlier.
          </div>
        </div>
      </div>
    </section>
  );
}
