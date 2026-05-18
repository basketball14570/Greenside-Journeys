import { H2, H3, LegalDoc } from "@/components/marketing/LegalDoc";

export default function TermsPage() {
  return (
    <LegalDoc
      eyebrow="● Terms of Service"
      title="Terms of service."
      lastUpdated="May 16, 2026"
    >
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of Greenside (the &quot;Service&quot;), operated by Greenside Journeys,
        LLC (&quot;Greenside,&quot; &quot;we,&quot; &quot;us&quot;). By creating
        an account or otherwise using the Service, you agree to be bound by
        these Terms.
      </p>

      <H2>1. The Service</H2>
      <p>
        Greenside is an analytics and information product for sports bettors and
        daily fantasy sports players. We do not accept wagers, hold customer
        funds, or process payments for bets placed on third-party sportsbooks or
        daily fantasy operators. We are not a sportsbook, casino, or gaming
        operator.
      </p>
      <p>
        Information provided by the Service — including but not limited to
        projections, alerts, EV calculations, hedge recommendations, and AI
        responses — is for entertainment and informational purposes only and
        does not constitute financial, betting, or gambling advice.
      </p>

      <H2>2. Eligibility</H2>
      <p>
        You must be at least 21 years old and a legal resident of a jurisdiction
        where sports wagering is legal to use this Service. You represent and
        warrant that you meet these requirements. We may suspend or terminate
        accounts that we reasonably believe do not.
      </p>

      <H2>3. Your account</H2>
      <H3>3.1 Registration</H3>
      <p>
        You must provide accurate, complete information when creating an account
        and keep it updated. You are responsible for safeguarding your
        credentials and all activity that occurs under your account.
      </p>
      <H3>3.2 Sportsbook credentials</H3>
      <p>
        <strong>We never ask for your sportsbook passwords or credentials.</strong>{" "}
        Bet data enters the Service only via (a) emails you voluntarily forward
        to your personal Greenside ingestion address, (b) screenshots you
        voluntarily upload, or (c) manual entry. You retain full control over
        what data enters the Service.
      </p>

      <H2>4. Acceptable use</H2>
      <p>You agree not to:</p>
      <ul className="list-disc pl-6 space-y-1">
        <li>Use the Service to evade or circumvent sportsbook terms of service or applicable laws.</li>
        <li>Resell, redistribute, or scrape Service data without our written permission (except as expressly permitted on paid tiers).</li>
        <li>Submit data on behalf of any person other than yourself.</li>
        <li>Use the Service if you have self-excluded from any state gaming registry.</li>
        <li>Reverse-engineer, decompile, or attempt to extract source code from the Service.</li>
      </ul>

      <H2>5. Subscriptions and billing</H2>
      <p>
        Paid subscriptions auto-renew at the end of each billing cycle until you
        cancel. You can cancel at any time from your account settings; access
        continues until the end of the paid period. We do not provide refunds
        for partial periods on monthly plans. Annual plans may be refunded
        prorated within 30 days of purchase.
      </p>
      <p>
        We reserve the right to change pricing with at least 30 days&apos;
        notice. Continued use after a price change constitutes acceptance.
      </p>

      <H2>6. Intellectual property</H2>
      <p>
        The Service, including its software, content, algorithms, and brand, is
        and remains the exclusive property of Greenside. You receive a limited,
        revocable, non-transferable license to use the Service for your personal
        non-commercial use (or, on the Sharp tier, the limited commercial use
        permitted by your subscription).
      </p>
      <p>
        You retain all rights to bet data you submit. You grant Greenside a
        non-exclusive license to process that data to provide the Service to
        you, and to use anonymized, aggregated data to improve the Service.
      </p>

      <H2>7. Third-party services</H2>
      <p>
        The Service integrates with third-party services including (but not
        limited to) DataGolf, Tomorrow.io, The Odds API, Anthropic, Supabase,
        Stripe, and Postmark. Your use of those services through Greenside is
        also subject to their respective terms.
      </p>

      <H2>8. Disclaimers</H2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
        WITHOUT WARRANTY OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR
        IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
      </p>
      <p>
        WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ACCURATE,
        TIMELY, OR ERROR-FREE. PROJECTIONS, ALERTS, AND AI RESPONSES ARE
        ESTIMATES BASED ON HISTORICAL DATA AND MAY BE INCORRECT.
      </p>

      <H2>9. Limitation of liability</H2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, GREENSIDE SHALL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, GAMBLING LOSSES,
        OR LOSS OF DATA. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR
        RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU
        PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
      </p>

      <H2>10. Indemnification</H2>
      <p>
        You agree to indemnify and hold harmless Greenside, its officers,
        directors, and employees from any claim arising out of your use of the
        Service or violation of these Terms.
      </p>

      <H2>11. Termination</H2>
      <p>
        We may suspend or terminate your account at any time for violation of
        these Terms or for any reason on reasonable notice. You may terminate
        your account at any time from settings.
      </p>

      <H2>12. Governing law</H2>
      <p>
        These Terms are governed by the laws of [State to be specified], without
        regard to its conflict-of-laws principles. Disputes shall be resolved in
        the state or federal courts located in [Venue to be specified].
      </p>

      <H2>13. Changes</H2>
      <p>
        We may update these Terms from time to time. Material changes will be
        announced via email and on the Service. Continued use constitutes
        acceptance.
      </p>

      <H2>14. Contact</H2>
      <p>
        Questions about these Terms? Email{" "}
        <a
          href="mailto:legal@greensideedge.com"
          className="text-text underline underline-offset-4"
        >
          legal@greensideedge.com
        </a>
        .
      </p>
    </LegalDoc>
  );
}
