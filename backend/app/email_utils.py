import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import SMTP_FROM, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER

logger = logging.getLogger(__name__)


def send_friend_invite_email(
    to_email: str,
    inviter_name: str,
    track: str,
    lobby_link: str,
    message: str | None = None,
) -> None:
    """Send a friend-invite email. Silently skips if SMTP is not configured."""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.info("SMTP not configured — skipping invite email to %s", to_email)
        return

    track_label = "Data Structures & Algorithms" if track == "dsa" else "Behavioral"
    personal_block = (
        f"""
        <div style="margin:20px 0;padding:14px 18px;background:#f9f9f9;border-left:3px solid #6366f1;border-radius:4px;font-style:italic;color:#555;">
          "{message}"
        </div>"""
        if message
        else ""
    )

    subject = f"{inviter_name} invited you to a mock interview on InterviewRamp"

    html = f"""
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#1a1a2e;padding:28px 32px;">
          <span style="color:#818cf8;font-size:22px;font-weight:800;letter-spacing:-0.5px;">InterviewRamp</span>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111;">You&apos;ve been invited!</h2>
          <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
            <strong style="color:#111;">{inviter_name}</strong> has invited you to a
            <strong style="color:#111;">{track_label}</strong> mock interview session on InterviewRamp.
          </p>
          {personal_block}
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
            Click the button below to join the lobby. You&apos;ll need to sign in (or create a free account)
            before entering — it only takes a moment.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="{lobby_link}"
               style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;font-size:15px;font-weight:700;border-radius:8px;text-decoration:none;letter-spacing:0.2px;">
              Join the Session
            </a>
          </div>
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">
            Or copy this link: <a href="{lobby_link}" style="color:#6366f1;">{lobby_link}</a><br/>
            This invite is valid for 7 days.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee;">
          <p style="margin:0;color:#bbb;font-size:11px;text-align:center;">
            InterviewRamp &mdash; Mock Interview Practice Platform
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = SMTP_FROM or SMTP_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM or SMTP_USER, to_email, msg.as_string())
        logger.info("Invite email sent to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send invite email to %s: %s", to_email, exc)
