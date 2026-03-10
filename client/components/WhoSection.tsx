const categories = [
  "Software Engineering", "Data Structures & Algorithms",
  "System Design", "Behavioral", "Data Science",
  "Machine Learning", "SQL", "Frontend Engineering",
  "Backend Engineering", "Product Management",
  "DevOps / SRE", "Mobile Engineering",
];

export default function WhoSection() {
  return (
    <section className="who-section" id="who">
      <div className="who-inner">
        {/* Pills */}
        <div className="pills-grid">
          {categories.map((cat) => (
            <span key={cat} className="pill">{cat}</span>
          ))}
        </div>

        {/* Copy */}
        <div>
          <div className="section-tag">Who's using it</div>
          <h2 className="section-title">How everyone in tech prepares</h2>
          <p className="section-subtitle">
            From new grads grinding LeetCode to senior engineers prepping for
            FAANG loops — Interview Ramp adapts to your role, level, and target
            companies with role-specific problem banks and rubrics.
          </p>
        </div>
      </div>
    </section>
  );
}
