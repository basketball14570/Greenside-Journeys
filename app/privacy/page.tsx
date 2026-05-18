import { H2, H3, LegalDoc } from "@/components/marketing/LegalDoc";

export default function PrivacyPage() {
  return (
    <LegalDoc
      eyebrow="● Privacy"
      title="Privacy policy."
      lastUpdated="May 16, 2026"
    >
      <p>
        This Privacy Policy describes how Greenside Journeys, LLC
        (&quot;Greenside&quot;) collects, uses, and discloses information when
        you use the Greenside service.
      </p>

      <H2>What we collect</H2>
      <H3>Information you provide</H3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Account information: email, display name, push subscription tokens.</li>
        <li>Payment information: handled by Stripe; we never see your card number.</li>
        <li>
          Bet data: line, odds, stake, player, market, book — extracted from
          emails you forward, screenshots you upload, or entries you create.
        </li>
        <li>Preferences: alert thresholds, followed tournaments, books you use.</li>
      </ul>

      <H3>Information collected automatically</H3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Device and browser information (user agent, viewport, OS).</li>
        <li>Usage events (page views, feature interactions) for product analytics.</li>
        <li>IP address for security and rate-limiting.</li>
      </ul>

      <H3>What we do NOT collect</H3>
      <ul className="list-disc pl-6 space-y-1">
        <li>Sportsbook passwords or credentials.</li>
        <li>Banking or sportsbook balance information.</li>
        <li>Government-issued ID (unless required for affiliate compliance).</li>
      </ul>

      <H2>How we use information</H2>
      <ul className="list-disc pl-6 space-y-1">
        <li>To provide the Service — parse bets, run the conditions alert engine, surface analytics.</li>
        <li>To send alerts you&apos;ve opted into.</li>
        <li>To improve our models using aggregated, anonymized data.</li>
        <li>To respond to support requests and operate the business (fraud prevention, compliance).</li>
      </ul>

      <H2>Sharing</H2>
      <p>We share information only with:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Service providers under contract (hosting, email, analytics, payment processing).</li>
        <li>Affiliate sportsbooks, when you click an affiliate link — they may set their own tracking.</li>
        <li>Authorities when legally required.</li>
        <li>Successor entities in the event of a merger or acquisition (with notice).</li>
      </ul>
      <p>
        <strong>We do not sell your personal information.</strong> We do not
        share your bet data with sportsbooks or marketers.
      </p>

      <H2>Cookies and similar technologies</H2>
      <p>
        We use first-party cookies for authentication and preferences, and a
        privacy-respecting analytics provider. We do not use third-party
        advertising cookies.
      </p>

      <H2>Data retention</H2>
      <p>
        We retain account and bet data for as long as your account is active,
        plus a reasonable period after closure for tax and compliance purposes.
        You can request export or deletion of your data at any time from
        settings or by emailing privacy@greensideedge.com.
      </p>

      <H2>Your rights</H2>
      <p>
        Depending on your jurisdiction, you may have rights to access, correct,
        delete, or port your personal data, and to opt out of certain
        processing. To exercise these rights, email{" "}
        <a
          href="mailto:privacy@greensideedge.com"
          className="text-text underline underline-offset-4"
        >
          privacy@greensideedge.com
        </a>
        .
      </p>

      <H2>Security</H2>
      <p>
        We use industry-standard security practices: TLS in transit, encrypted
        storage, role-based access controls, and regular audits. No system is
        perfectly secure; please use a strong, unique password and report any
        suspected unauthorized access.
      </p>

      <H2>Children</H2>
      <p>
        The Service is for users 21+. We do not knowingly collect personal
        information from anyone under 21. If you believe we&apos;ve collected
        such information, contact us and we&apos;ll delete it.
      </p>

      <H2>Changes</H2>
      <p>
        Material changes will be announced by email and via the Service.
        Continued use constitutes acceptance.
      </p>

      <H2>Contact</H2>
      <p>
        Questions?{" "}
        <a
          href="mailto:privacy@greensideedge.com"
          className="text-text underline underline-offset-4"
        >
          privacy@greensideedge.com
        </a>
        .
      </p>
    </LegalDoc>
  );
}
