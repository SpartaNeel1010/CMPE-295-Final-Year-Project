const testimonials = [
  {
    initials: "MR",
    color: "#4f46e5",
    name: "Maritza",
    role: "Product Manager, Microsoft",
    stars: 5,
    text: "Interview Ramp's peer-to-peer mock interviews, structured rubrics, and AI coaching were everything I needed in one place to land my dream PM role.",
  },
  {
    initials: "FP",
    color: "#0891b2",
    name: "Filipe",
    role: "Software Engineer, Google",
    stars: 5,
    text: "Nothing beats practicing with real people under time pressure. I wasn't nervous on the day of my interviews and got offers from Google and Microsoft.",
  },
  {
    initials: "YA",
    color: "#059669",
    name: "Yinka",
    role: "Data Scientist, Meta",
    stars: 5,
    text: "I truly benefited from the mock interview practice and AI feedback sessions. Interview Ramp gave me everything I needed to succeed at Meta.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="testimonials-section" id="testimonials">
      <h2 className="section-title" style={{ textAlign: "center" }}>Testimonials</h2>
      <p className="section-subtitle" style={{ margin: "0.75rem auto 0" }}>
        Join thousands of candidates using Interview Ramp to practice and land their dream jobs.
      </p>

      <div className="testimonials-grid">
        {testimonials.map((t) => (
          <div key={t.name} className="testimonial-card">
            <div className="testimonial-header">
              <div className="testimonial-avatar" style={{ background: t.color }}>
                {t.initials}
              </div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            </div>
            <div className="testimonial-stars">
              {[...Array(t.stars)].map((_, i) => <span key={i}>★</span>)}
            </div>
            <p className="testimonial-text">{t.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
