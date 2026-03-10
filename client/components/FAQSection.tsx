"use client";

import { useState } from "react";

const faqs = [
  {
    q: "What types of interviews can I practice on Interview Ramp?",
    a: "We support LeetCode-style coding interviews (Easy/Medium/Hard), system design sessions, and behavioral interviews. Each type has its own curated problem bank, rubric, and AI feedback model.",
  },
  {
    q: "How does the peer matching work?",
    a: "Our matching engine pairs you with candidates targeting the same roles and companies. Matches are based on experience level, availability, and the type of interview you want to practice. Both peers take turns as interviewer and interviewee.",
  },
  {
    q: "What does the collaborative coding environment look like?",
    a: "You get a shared browser-based code editor with syntax highlighting, real-time collaboration, and sandboxed code execution — no setup needed. It works just like the environment used in real FAANG interviews.",
  },
  {
    q: "How does the AI feedback work?",
    a: "The AI transcribes your session, analyzes your communication patterns and problem-solving approach, then generates a structured rubric-aligned report — covering things like clarity of thought, time complexity awareness, and how well you handle edge cases.",
  },
  {
    q: "Is Interview Ramp free to use?",
    a: "Yes — you can start practicing for free with a limited number of peer sessions per month. Unlimited sessions, AI feedback, and advanced analytics are available on our Pro plan.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq-section" id="faq">
      <div className="faq-inner">
        <h2 className="section-title">Frequently asked questions</h2>
        <p className="section-subtitle" style={{ margin: "0 auto" }}>
          Everything you need to know about Interview Ramp.
        </p>

        <div className="faq-list">
          {faqs.map((item, i) => (
            <div key={i} className="faq-item">
              <button
                id={`faq-q-${i}`}
                className="faq-question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
              >
                {item.q}
                <span
                  className="faq-chevron"
                  style={{ transform: openIndex === i ? "rotate(180deg)" : "none" }}
                >
                  ▼
                </span>
              </button>
              {openIndex === i && (
                <p className="faq-answer">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
