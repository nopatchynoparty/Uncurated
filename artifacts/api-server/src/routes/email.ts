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
  colorScheme?: "light" | "dark";
  archetype?: string;
  archetype_secondary?: string;
}

interface EmailColors {
  bodyBg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textWhy: string;
  accent: string;
  btnText: string;
  logoUn: string;
}

const DARK_COLORS: EmailColors = {
  bodyBg: "#0F0F0F", surface: "#1A1A1A", surface2: "#222222", border: "#2A2A2A",
  text: "#F5F5F5", textMuted: "#888888", textFaint: "#555555", textWhy: "#AAAAAA",
  accent: "#F5A623", btnText: "#0F0F0F", logoUn: "#888888",
};

const LIGHT_COLORS: EmailColors = {
  bodyBg: "#f5f5f2", surface: "#ffffff", surface2: "#f0f0ec", border: "#e0e0d8",
  text: "#111111", textMuted: "#666666", textFaint: "#aaaaaa", textWhy: "#666666",
  accent: "#f5a623", btnText: "#0f0f0f", logoUn: "#888888",
};

const ARCHETYPE_EMAIL_ICONS: Record<string, string> = {
  "The Dark Escapist": "🌙",
  "The Compulsive Page-Turner": "⚡",
  "The World-Builder": "🪐",
  "The Reluctant Literary": "📖",
  "The True Crime Mind": "🔍",
  "The Intellectual Adventurer": "🔭",
  "The Comfort Rereader": "🤍",
  "The Historical Immersionist": "⏳",
  "The Concept Reader": "👾",
  "The Quiet Realist": "👁",
  "The Epic Completionist": "🗺",
  "The Atmosphere Chaser": "✨",
};

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

function buildRecCard(rec: Recommendation, linkText: string | null, c: EmailColors): string {
  const score = Math.round(typeof rec.match_score === "number" ? rec.match_score : Number(rec.match_score));
  const safeLink = isTrustedUrl(rec.amazon_search) ? rec.amazon_search : null;

  const buttonHtml = linkText && safeLink ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px;">
                <tr>
                  <td style="background-color: ${c.accent}; border-radius: 6px;">
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                       style="display: block; width: 100%; background-color: ${c.accent}; border-radius: 6px; color: ${c.btnText}; font-family: 'DM Sans', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 600; padding: 12px 20px; text-decoration: none; mso-padding-alt: 0; text-align: center; box-sizing: border-box;">
                      ${escapeHtml(linkText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>` : "";

  return `
          <!-- Rec card -->
          <tr>
            <td style="padding-bottom: 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${c.surface}; border-radius: 10px; border: 1px solid ${c.border};">
                <tr>
                  <td style="padding: 24px;">
                    <!-- Title + score row -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="vertical-align: top; padding-right: 16px;">
                          <p style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 400; color: ${c.text}; margin: 0 0 5px 0; line-height: 1.3;">${escapeHtml(rec.title)}</p>
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.textMuted}; font-size: 14px; margin: 0;">${escapeHtml(rec.author)}</p>
                        </td>
                        <td style="text-align: right; vertical-align: top; white-space: nowrap; width: 64px;">
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.accent}; font-size: 26px; font-weight: 700; margin: 0; line-height: 1;">${score}%</p>
                          <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.textFaint}; font-size: 10px; margin: 2px 0 0 0; text-transform: uppercase; letter-spacing: 1.5px;">match</p>
                        </td>
                      </tr>
                    </table>
                    <!-- Watch metadata (format / runtime / platform / year) -->
                    ${rec.format || rec.runtime || rec.where_to_watch || rec.year ? `
                    <p style="margin: 12px 0 0 0; font-family: 'DM Sans', Arial, Helvetica, sans-serif; line-height: 2;">
                      ${rec.format ? `<span style="display: inline-block; background-color: ${c.surface2}; color: ${c.textFaint}; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 99px; border: 1px solid ${c.border}; margin-right: 4px;">${escapeHtml(rec.format)}</span>` : ""}
                      ${rec.runtime ? `<span style="display: inline-block; background-color: ${c.surface2}; color: ${c.textMuted}; font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 1px solid ${c.border}; margin-right: 4px;">${escapeHtml(rec.runtime)}</span>` : ""}
                      ${rec.where_to_watch ? `<span style="display: inline-block; background-color: ${c.surface2}; color: ${c.textMuted}; font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 1px solid ${c.border}; margin-right: 4px;">${escapeHtml(rec.where_to_watch)}</span>` : ""}
                      ${rec.year ? `<span style="display: inline-block; background-color: ${c.surface2}; color: ${c.textMuted}; font-size: 11px; padding: 2px 8px; border-radius: 99px; border: 1px solid ${c.border};">${escapeHtml(rec.year)}</span>` : ""}
                    </p>` : ""}
                    <!-- Vibe tag -->
                    <p style="margin: 14px 0 0 0; font-family: 'DM Sans', Arial, Helvetica, sans-serif;">
                      <span style="display: inline; background-color: ${c.surface2}; color: ${c.accent}; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 99px; border: 1px solid ${c.accent};">${escapeHtml(rec.vibe)}</span>
                    </p>
                    <!-- Why -->
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.textWhy}; font-size: 14px; line-height: 1.7; margin: 12px 0 0 0;">${escapeHtml(rec.why)}</p>
                    ${buttonHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function buildEmailHtml(tasteProfile: string, recs: Recommendation[], category: string, colorScheme: "light" | "dark" = "dark", archetype?: string, archetypeSecondary?: string): string {
  const c = colorScheme === "light" ? LIGHT_COLORS : DARK_COLORS;

  const linkText =
    category === "books" ? "Find on Amazon"
    : category === "podcasts" || category === "music" ? "Find on Spotify"
    : null;

  const recCardsHtml = recs.map((rec) => buildRecCard(rec, linkText, c)).join("\n");

  const subjectCategory =
    category === "books" ? "book"
    : category === "podcasts" ? "podcast"
    : category === "music" ? "music"
    : "viewing";

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
<body style="background-color: ${c.bodyBg}; margin: 0; padding: 0; width: 100%; min-width: 100%; font-family: 'DM Sans', Arial, Helvetica, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${c.bodyBg}; border-collapse: collapse;">
    <tr>
      <td align="center" class="mobile-pad" style="padding: 48px 24px 56px;">

        <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; width: 100%; border-collapse: collapse;">

          <!-- ── Header ── -->
          <tr>
            <td style="text-align: center; padding-bottom: 48px;">
              <h1 style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 40px; font-weight: 400; color: ${c.text}; margin: 0 0 10px 0; letter-spacing: -0.5px; line-height: 1.1;">
                <span style="text-decoration: line-through; text-decoration-color: ${c.accent}; color: ${c.logoUn};">Un</span>curated
              </h1>
              <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.textMuted}; font-size: 14px; margin: 0; line-height: 1.5;">No algorithms. No sponsors. Just honest recommendations.</p>
            </td>
          </tr>

          <!-- ── Archetype ── -->
          ${archetype ? `
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <p style="font-size: 32px; margin: 0 0 8px 0; line-height: 1;">${escapeHtml(ARCHETYPE_EMAIL_ICONS[archetype] ?? "")}</p>
              <h2 style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 32px; font-weight: 400; color: ${c.text}; margin: 0 0 6px 0; line-height: 1.2;">${escapeHtml(archetype)}</h2>
              ${archetypeSecondary ? `<p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; font-size: 14px; color: ${c.textMuted}; margin: 0;">with a streak of ${escapeHtml(archetypeSecondary)}</p>` : ""}
            </td>
          </tr>
          ` : ""}

          <!-- ── Taste Profile ── -->
          <tr>
            <td style="padding-bottom: 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${c.surface}; border-radius: 10px; border: 1px solid ${c.border}; border-collapse: collapse;">
                <tr>
                  <td style="padding: 26px 28px;">
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.accent}; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 14px 0; font-weight: 600;">Your Uncurated Profile</p>
                    <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.text}; font-size: 15px; line-height: 1.7; margin: 0;">${escapeHtml(tasteProfile)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Section heading ── -->
          <tr>
            <td style="padding-bottom: 20px;">
              <h2 style="font-family: 'DM Serif Display', Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; color: ${c.text}; margin: 0; line-height: 1.2;">Recommended for you</h2>
            </td>
          </tr>

          <!-- ── Recommendation cards ── -->
          ${recCardsHtml}

          <!-- ── Divider ── -->
          <tr>
            <td style="padding-top: 8px; padding-bottom: 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                <tr><td style="border-top: 1px solid ${c.border}; height: 1px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="text-align: center;">
              <p style="font-family: 'DM Sans', Arial, Helvetica, sans-serif; color: ${c.textFaint}; font-size: 13px; margin: 0; line-height: 1.7;">
                Powered by Claude &nbsp;&middot;&nbsp; No affiliate influence on recommendations &nbsp;&middot;&nbsp; <a href="https://uncurated.app" style="color: ${c.textFaint}; text-decoration: underline;">uncurated.app</a><br>This is a one-time email — you won't hear from us again.
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

  const { email, taste_profile, recommendations, category, colorScheme, archetype, archetype_secondary } = req.body as EmailRequest;

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
    : category === "music" ? "music"
    : "viewing";

  const html = buildEmailHtml(taste_profile, recommendations, category ?? "books", colorScheme === "light" ? "light" : "dark", archetype, archetype_secondary);

  const resend = new Resend(apiKey);
  try {
    await resend.emails.send({
      from: "Uncurated <hello@uncurated.app>",
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
