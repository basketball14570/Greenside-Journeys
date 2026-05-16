import { H2, LegalDoc } from "@/components/marketing/LegalDoc";

export default function ResponsibleGamblingPage() {
  return (
    <LegalDoc
      eyebrow="● Responsible gambling"
      title="Bet smart. Bet safely."
      lastUpdated="May 16, 2026"
    >
      <p>
        Greenside is an analytics product. We don&apos;t accept wagers and we
        don&apos;t profit from your losses. But we know that the people who use
        us are placing real bets on real sportsbooks — and we believe
        responsible gambling is a feature, not a footnote.
      </p>

      <H2>Set limits before you need them</H2>
      <p>
        Decide your bankroll before tee time, not after a bad beat. Greenside
        surfaces your unit risk on every bet card and your cumulative P&L on
        every dashboard for exactly this reason: friction helps. If you find
        yourself betting outside the plan you set in the morning, that&apos;s a
        signal worth taking seriously.
      </p>

      <H2>Warning signs</H2>
      <ul className="list-disc pl-6 space-y-1.5">
        <li>Chasing losses with bigger bets.</li>
        <li>Betting on events you don&apos;t actually follow.</li>
        <li>Hiding bets or losses from your partner or family.</li>
        <li>Borrowing money to bet.</li>
        <li>Anxiety about results outside your control.</li>
      </ul>
      <p>
        If any of these resonate, please use the resources below. There&apos;s
        no shame in it — recognizing the pattern early is the win.
      </p>

      <H2>Get help — 24/7</H2>
      <ul className="list-none pl-0 space-y-3">
        <li>
          <strong className="text-text">National Council on Problem Gambling</strong>
          <br />
          <a
            href="tel:1-800-426-2537"
            className="text-text underline underline-offset-4"
          >
            1-800-GAMBLER (1-800-426-2537)
          </a>{" "}
          ·{" "}
          <a
            href="https://www.ncpgambling.org"
            className="text-text underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            ncpgambling.org
          </a>
        </li>
        <li>
          <strong className="text-text">Gamblers Anonymous</strong>
          <br />
          <a
            href="https://www.gamblersanonymous.org"
            className="text-text underline underline-offset-4"
            target="_blank"
            rel="noreferrer"
          >
            gamblersanonymous.org
          </a>
        </li>
        <li>
          <strong className="text-text">SAMHSA National Helpline</strong>
          <br />
          <a
            href="tel:1-800-662-4357"
            className="text-text underline underline-offset-4"
          >
            1-800-662-HELP (4357)
          </a>{" "}
          · free, confidential, 24/7
        </li>
        <li>
          <strong className="text-text">State self-exclusion programs</strong>
          <br />
          Most US states with legal sports betting maintain a voluntary
          self-exclusion list. Visit your state gaming commission&apos;s website
          to enroll.
        </li>
      </ul>

      <H2>What Greenside does</H2>
      <ul className="list-disc pl-6 space-y-1.5">
        <li>
          <strong className="text-text">21+ gating.</strong> Account creation
          requires confirmation of legal age and residence in a state where
          sports wagering is legal.
        </li>
        <li>
          <strong className="text-text">Self-exclusion respected.</strong> If
          you&apos;re on a state self-exclusion list, contact us and we&apos;ll
          close your Greenside account immediately and prevent re-registration
          with the same details.
        </li>
        <li>
          <strong className="text-text">Personal caps.</strong> Set a daily,
          weekly, or monthly bet-tracking volume cap in settings. When you cross
          it, the dashboard surfaces a friction prompt before letting you log
          more activity.
        </li>
        <li>
          <strong className="text-text">No nudging to bet.</strong> Our alerts
          surface information; they never tell you to place a bet. We don&apos;t
          run paid promotions encouraging deposits.
        </li>
        <li>
          <strong className="text-text">Pause anytime.</strong> One-click pause
          in settings hides all bet data and alerts for a self-chosen period.
        </li>
      </ul>

      <H2>If you&apos;re worried about someone else</H2>
      <p>
        The 1-800-GAMBLER line offers support for family and friends. If a loved
        one is showing signs of problem gambling, reach out — early
        conversations make the biggest difference.
      </p>
    </LegalDoc>
  );
}
