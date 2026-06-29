import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Uncurated",
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Uncurated</Link>

      <h1>Privacy Policy</h1>
      <p className="legal-date">Last updated: June 2026</p>

      <p>
        Uncurated is a recommendation tool. We try to collect as little data as possible
        and we don't build profiles, serve ads, or sell anything about you.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your book, show, game, or podcast list</strong> — typed or imported by
          you. This is sent to Anthropic's Claude API to generate your recommendations and
          is not stored on our servers after your request completes.
        </li>
        <li>
          <strong>Shelf photos</strong> — if you use the bookshelf scanner, your photo is
          compressed client-side and sent to Claude for text recognition. It is not stored.
        </li>
        <li>
          <strong>Email address</strong> — only if you choose to email yourself your
          results. It is passed to Resend to deliver your email and is not stored by us.
        </li>
      </ul>

      <h2>What we don't collect</h2>
      <ul>
        <li>No accounts or passwords</li>
        <li>No tracking cookies or fingerprinting</li>
        <li>No analytics beyond Vercel's anonymous infrastructure metrics</li>
        <li>No advertising or third-party marketing pixels</li>
      </ul>

      <h2>Third-party processors</h2>
      <ul>
        <li>
          <strong>Anthropic</strong> — processes your lists and photos to generate
          recommendations.{" "}
          <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">
            Anthropic Privacy Policy →
          </a>
        </li>
        <li>
          <strong>Resend</strong> — delivers recommendation emails if you request one.{" "}
          <a href="https://resend.com/privacy" target="_blank" rel="noopener noreferrer">
            Resend Privacy Policy →
          </a>
        </li>
        <li>
          <strong>Vercel</strong> — hosts the app and may log IP addresses for security
          and rate limiting.{" "}
          <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
            Vercel Privacy Policy →
          </a>
        </li>
        <li>
          <strong>Amazon</strong> — if you click a "Find on Amazon" link, Amazon may set
          cookies and track your visit. We participate in the Amazon Associates programme.{" "}
          <a href="https://www.amazon.co.uk/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener noreferrer">
            Amazon Privacy Notice →
          </a>
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        We don't store your lists, photos, or email address. Your data lives only in your
        browser session and in the API requests made on your behalf. Once the page is
        closed, it's gone.
      </p>

      <h2>Your rights</h2>
      <p>
        If you're in the EU or UK, you have rights under GDPR including access, erasure,
        and portability. Since we don't store personal data ourselves, there's nothing for
        us to delete — but you can reach us via the{" "}
        <a href="https://tally.so/r/2E1DP9" target="_blank" rel="noopener noreferrer">
          feedback form
        </a>{" "}
        with any questions.
      </p>

      <h2>Changes</h2>
      <p>
        If we make material changes to this policy we'll update the date above. Continued
        use of the service constitutes acceptance.
      </p>
    </div>
  );
}
