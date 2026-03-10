export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <span className="footer-brand">Interview Ramp</span>
      <p className="footer-copy">© {year} Interview Ramp · CMPE 295 Final Year Project · San José State University</p>
      <div className="footer-links">
        <a href="#how-it-works">How it works</a>
        <a href="#faq">FAQ</a>
        <a href="/login">Log in</a>
        <a href="/signup">Sign up</a>
      </div>
    </footer>
  );
}
