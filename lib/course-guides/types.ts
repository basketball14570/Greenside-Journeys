// Course guide — curated, long-form analysis published once per week
// (Sunday evening, 4 days before tournament tee-off). Distinct from the
// dynamic /preview which composes a fit-ranked snapshot at request time;
// guides are hand-edited content that ages well across the week.

export type DriverTier = {
  id: "elite" | "mid" | "bottom";
  label: string;
  range: string;          // "310+ yards"
  description: string;
  examples: string[];
  expectedScore: string;  // "-23 to -26 (winning range)"
  // Average approach yardage across the round.
  avgApproachYds: number;
  totalApproachYds: number;
  // Free-text "what they need to do to win" paragraph.
  keyToSuccess: string;
};

export type HoleGuide = {
  hole: number;
  par: 3 | 4 | 5;
  yards: number;
  // Approach yardage per tier. Par 3s use the tee-shot yardage in all
  // three slots (they're equal — distance doesn't differentiate).
  approachYds: Record<DriverTier["id"], number>;
  approachClubs: Record<DriverTier["id"], string>;
  strategy: string;
  flag?: "penalty" | "opportunity" | "neutral";
  keyInsight?: string;
};

export type CourseGuide = {
  slug: string;
  // ISO date of publication — "2026-05-17T22:00:00Z". Tournament starts
  // Thursday so publish Sunday evening = 4 days before.
  publishedAt: string;
  tournamentStartsAt: string;
  tournament: string;
  // Tournament dates rendered short-form: "May 21-24, 2026"
  dates: string;
  courseName: string;
  location: string;
  designer: string;
  established: number;
  par: number;
  yards: number;
  courseRating: number;
  slope: number;
  greens: string;
  fairways: string;
  difficultyRank: string;
  waterOnHoles: number;
  // 1-2 sentence headline for hero / share card.
  headline: string;
  // 3-4 sentence summary read out of bedside-table reading height.
  // Renders as the TL;DR card above the full guide.
  tldr: string;
  // Optional hero image URL relative to /public. Drop a tournament photo
  // here for the cover; falls back to a tasteful gradient otherwise.
  heroImage?: string;
  // Strategic skill ranking from highest to lowest impact.
  skillStack: string[];
  tiers: DriverTier[];
  holes: HoleGuide[];
  // Holes the data calls out specifically as brutal-for-shorter-hitters
  // or birdie opportunities. Used for the "penalty / opportunity" card.
  penaltyHoles: number[];
  opportunityHoles: number[];
  // Course-fit and betting takeaways — short bulleted paragraphs.
  bettingAngles: BettingAngle[];
  // Final verdict paragraph, 2-3 sentences.
  verdict: string;
};

export type BettingAngle = {
  title: string;
  body: string;
  // Tag so the UI can color-code: "fit" = green, "fade" = red,
  // "prop" = amber, "general" = neutral.
  tone: "fit" | "fade" | "prop" | "general";
};
