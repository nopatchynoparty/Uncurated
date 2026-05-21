import { Router } from "express";
import { Resend } from "resend";

const router = Router();

interface Recommendation {
  title: string;
  author: string;
  match_score: number;
  why: string;
  vibe: string;
  amazon_search: string;
  format?: string;
  runtime?: string;
  where_to_watch?: string;
  year?: string;
}

interface EmailRequest {
  email: string;
  taste_profile: string;
  recommendations: Recommendation[];
  category: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function isTrustedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const trusted = [
      "www.amazon.co.uk", "amazon.co.uk",
      "www.amazon.com", "amazon.com",
      "open.spotify.com",
    ];
    return parsed.protocol === "https:" && trusted.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function buildRecCard(rec: Recommendation, linkText: string | null): string {
  const score = Math.round(typeof rec.match_score === "number" ? rec.match_score : Number(rec.match_score));
  const safeLink = isTrustedUrl(rec.amazon_search) ? rec.amazon_search : null;

  const buttonHtml = linkText && safeLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                <tr>
                  <td style="background-color: #F5A623; border-radius: 6px;">
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                       style="display: inline-block; background-color: #F5A623; border-radius: 6px; color: #0F0F0F; font-family: 'DM Sans', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; padding: 10px 20px; text-decoration: none; mso-padding-alt: 0; text-align: center;">
                      ${escapeHtml(linkText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>` : "";

  return `
          <!-- Rec card -->
          <tr>
            <td style="padding-bottom: 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1A1A1A; border-radius: 10px; border: 1px solid #2A2A2A;">
                <tr>
                  <td style="padding: 24px;">
                    <!-- Title + score row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <p style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 400; color: #F5F5F5; margin: 0 0 5px 0; line-height: 1.3;">${escapeHtml(rec.title)}</p>
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #888888; font-size: 14px; margin: 0;">${escapeHtml(rec.author)}</p>
                        </td>
                        <td style="text-align: right; vertical-align: top; white-space: nowrap; width: 64px;">
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #F5A623; font-size: 26px; font-weight: 700; margin: 0; line-height: 1;">${score}%</p>
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #555555; font-size: 10px; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">match</p>
                        </td>
                      </tr>
                    </table>
                    <!-- Vibe tag -->
                    <p style="margin: 14px 0 0 0; font-family: 'DM Sans', Arial, Helvetica, sans-serif;">
                      <span style="display: inline; background-color: #222222; color: #F5A623; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 99px; border: 1px solid #2A2A2A;">${escapeHtml(rec.vibe)}</span>
                    </p>
                    <!-- Why -->
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #AAAAAA; font-size: 14px; line-height: 1.7; margin: 12px 0 0 0;">${escapeHtml(rec.why)}</p>
                    ${buttonHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function buildEmailHtml(tasteProfile: string, recs: Recommendation[], category: string): string {
  const linkText =
    category === "books" ? "Find on Amazon"
    : category === "podcasts" ? "Find on Spotify"
    : null;

  const recCardsHtml = recs.map((rec) => buildRecCard(rec, linkText)).join("\n");

  const subjectCategory =
    category === "books" ? "book"
    : category === "podcasts" ? "podcast"
    : "watch";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your Uncurated ${escapeHtml(subjectCategory)} recommendations</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap');
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    * { box-sizing: border-box; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; min-width: 100% !important; }
      .mobile-pad { padding-left: 16px !important; padding-right: 16px !important; }
    }
  </style>
</head>
<body style="background-color: #0F0F0F; margin: 0; padding: 0; width: 100%; min-width: 100%; font-family: 'DM Sans', Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F0F0F; border-collapse: collapse;">
    <tr>
      <td align="center" class="mobile-pad" style="padding: 48px 24px 56px;">

        <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; border-collapse: collapse;">

          <!-- ── Header ── -->
          <tr>
            <td style="text-align: center; padding-bottom: 48px;">
              <h1 style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 40px; font-weight: 400; color: #F5F5F5; margin: 0 0 10px 0; letter-spacing: -0.5px; line-height: 1.1;">
                <span style="text-decoration: line-through; text-decoration-color: #F5A623; color: #888888;">Un</span>curated
              </h1>
              <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #888888; font-size: 14px; margin: 0; line-height: 1.5;">No algorithms. No sponsors. Just honest recommendations.</p>
            </td>
          </tr>

          <!-- ── Taste Profile ── -->
          <tr>
            <td style="padding-bottom: 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1A1A1A; border-radius: 10px; border: 1px solid #2A2A2A; border-collapse: collapse;">
                <tr>
                  <td style="padding: 26px 28px;">
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #F5A623; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 14px 0; font-weight: 600;">Your Uncurated Profile</p>
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #F5F5F5; font-size: 15px; line-height: 1.7; margin: 0;">${escapeHtml(tasteProfile)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Section heading ── -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h2 style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: #F5F5F5; margin: 0; line-height: 1.2;">Recommended for you</h2>
            </td>
          </tr>

          <!-- ── Recommendation cards ── -->
          ${recCardsHtml}

          <!-- ── Divider ── -->
          <tr>
            <td style="padding-top: 8px; padding-bottom: 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                <tr><td style="border-top: 1px solid #2A2A2A; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="text-align: center;">
              <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: #555555; font-size: 13px; margin: 0; line-height: 1.7;">
                Powered by Claude &nbsp;&middot;&nbsp; No affiliate influence on recommendations &nbsp;&middot;&nbsp; <a href="https://un-curated.replit.app" style="color: #555555; text-decoration: underline;">un-curated.replit.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

router.post("/email", async (req, res) => {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "Email service is not configured." });
    return;
  }

  const { email, taste_profile, recommendations, category } = req.body as EmailRequest;

  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Please provide a valid email address." });
    return;
  }
  if (email.length > 254) {
    res.status(400).json({ error: "Email address is too long." });
    return;
  }
  if (!taste_profile || typeof taste_profile !== "string") {
    res.status(400).json({ error: "Missing taste profile." });
    return;
  }
  if (!Array.isArray(recommendations) || recommendations.length === 0 || recommendations.length > 10) {
    res.status(400).json({ error: "Invalid recommendations." });
    return;
  }

  const categoryLabel =
    category === "books" ? "book"
    : category === "podcasts" ? "podcast"
    : "watch";

  const html = buildEmailHtml(taste_profile, recommendations, category ?? "books");

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Uncurated <onboarding@resend.dev>",
      to: email,
      subject: `Your Uncurated ${categoryLabel} recommendations`,
      html,
    });
    res.json({ ok: true });
  } catch (err: unknown) {
    req.log.error({ err }, "Resend send error");
    res.status(502).json({ error: "Failed to send email. Please try again." });
  }
});

export default router;
