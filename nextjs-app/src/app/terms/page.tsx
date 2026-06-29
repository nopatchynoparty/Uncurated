import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Uncurated",
};

export default function TermsPage() {
  return (
    <div className="legal-page">
      <Link href="/" className="legal-back">← Uncurated</Link>

      <h1>Terms of Service</h1>
      <p className="legal-date">Last updated: June 2026</p>

      <p>
        By using Uncurated you agree to these terms. They're intentionally short.
      </p>

      <h2>The service</h2>
      <p>
        Uncurated provides AI-generated recommendations based on the titles you enter.
        Recommendations are produced by a large language model and may occasionally be
        inaccurate, hallucinated, or not to your taste. We make no guarantees about
        the quality, accuracy, or availability of recommendations.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Scrape or automate requests to our API</li>
        <li>Attempt to circumvent rate limits or security measures</li>
        <li>Use the service for any unlawful purpose</li>
        <li>Resell or commercially exploit the service without permission</li>
      </ul>

      <h2>Amazon affiliate disclosure</h2>
      <p>
        Uncurated is a participant in the Amazon Associates Programme, an affiliate
        advertising programme designed to provide a means for sites to earn advertising
        fees by advertising and linking to Amazon. When you click a "Find on Amazon" link
        and make a purchase, we may earn a small commission at no extra cost to you.
        This does not influence which titles we recommend — recommendations are generated
        solely based on your taste.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The Uncurated name, logo, and interface are our property. Book titles, authors,
        and other content referenced in recommendations belong to their respective owners.
      </p>

      <h2>Disclaimers and limitation of liability</h2>
      <p>
        The service is provided "as is" without warranty of any kind. We are not liable
        for any indirect, incidental, or consequential damages arising from your use of
        the service, including but not limited to reliance on AI-generated recommendations.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms at any time. The date above reflects the last change.
        Continued use constitutes acceptance of the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions?{" "}
        <a href="https://tally.so/r/2E1DP9" target="_blank" rel="noopener noreferrer">
          Reach us via the feedback form.
        </a>
      </p>
    </div>
  );
}
