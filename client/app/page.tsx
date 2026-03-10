import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhoSection from "@/components/WhoSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import BenefitsSection from "@/components/BenefitsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* ── Top navigation bar ── */}
      <Navbar />

      {/* ── Hero / above-the-fold ── */}
      <HeroSection />

      {/* ── Who is using it / category pills ── */}
      <WhoSection />

      {/* ── How it works ── */}
      <HowItWorksSection />

      {/* ── Benefits / why use it ── */}
      <BenefitsSection />

      {/* ── Testimonials ── */}
      <TestimonialsSection />

      {/* ── FAQ accordion ── */}
      <FAQSection />

      {/* ── CTA banner ── */}
      <CTABanner />

      {/* ── Footer ── */}
      <Footer />
    </main>
  );
}
