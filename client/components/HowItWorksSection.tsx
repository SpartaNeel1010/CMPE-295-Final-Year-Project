const steps = [
  {
    icon: "📅",
    title: "Schedule a session",
    text: "Join instantly or pre-schedule an hour-long mock interview. Pick your target role, difficulty, and interview type — coding, system design, or behavioral.",
  },
  {
    icon: "🤝",
    title: "Get matched with a peer",
    text: "Our matching engine pairs you with candidates preparing for the same roles. Take turns as interviewer and interviewee for a fully realistic loop experience.",
  },
  {
    icon: "💬",
    title: "Exchange structured feedback",
    text: "After the session, trade detailed AI-generated notes and rubric scores. Get honest, actionable feedback on both your technical depth and communication skills.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="section-tag" style={{ textAlign: "center", display: "block" }}>How it works</div>
      <h2 className="how-title">How to schedule a practice session</h2>

      <div className="how-grid">
        {steps.map((step) => (
          <div key={step.title} className="how-card">
            <div className="how-icon">{step.icon}</div>
            <div className="how-card-title">{step.title}</div>
            <p className="how-card-text">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
