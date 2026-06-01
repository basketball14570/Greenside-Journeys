import type { CourseGuide } from "./types";

// 2026 Charles Schwab Challenge — Colonial Country Club ("Hogan's Alley").
// Source: Colonial condensed analysis doc (driving-distance tiers,
// approach-yardage-by-tier tables, Horseshoe + scoring-hole callouts).
// Per-hole yardages derive from the doc's elite-tier approach + ~315yd
// drive on par 4s (matches the doc's given holes 3/4/5), with par 5s as
// the front/back-nine residual; par-3 lengths are taken straight from the
// doc. Publishes Sunday evening, 4 days before Thursday tee-off.

export const COLONIAL_COUNTRY_CLUB: CourseGuide = {
  slug: "colonial-country-club",
  publishedAt: "2026-05-24T22:00:00Z",
  tournamentStartsAt: "2026-05-28T13:00:00Z",
  tournament: "Charles Schwab Challenge",
  dates: "May 28–31, 2026",
  courseName: "Colonial Country Club",
  location: "Fort Worth, TX",
  designer: "John Bredemus & Perry Maxwell",
  established: 1936,
  par: 70,
  yards: 7010,
  courseRating: 73.7,
  slope: 132,
  greens: "Bentgrass",
  fairways: "Bermudagrass (narrow)",
  difficultyRank: "A demanding par 70 — precision over power",
  waterOnHoles: 4,
  headline: "Hogan's Alley rewards the iron, not the driver — a precision par 70.",
  tldr:
    "Colonial is a short-approach precision test, not a bombers' track: no approach all week exceeds 250 yards and ~39% land in the comfortable 100–150 range. Narrow, tree-lined fairways and subtle bentgrass greens — plus the brutal 3-4-5 'Horseshoe' — mean accuracy and mid-iron control decide it. Short hitters with elite ball-striking can absolutely contend here; pure distance without fairways cannot.",
  skillStack: [
    "Driving accuracy (narrow fairways)",
    "Strokes Gained: Approach (100–150 yds)",
    "Mid-iron precision",
    "Putting (bentgrass touch)",
    "Course management",
  ],
  tiers: [
    {
      id: "elite",
      label: "Elite drivers",
      range: "310+ yards",
      description:
        "Top-40 Tour drivers. 38.9% of approaches fall in the comfortable 100–150 range and 27.8% are wedges / short irons. No approach exceeds 250 yards — Colonial is a short-approach course where distance is largely neutralized.",
      examples: ["Rory McIlroy", "Cameron Champ", "Aldrich Potgieter"],
      expectedScore: "−8 to −12 (winning range −8 to −10)",
      avgApproachYds: 131.7,
      totalApproachYds: 2370,
      keyToSuccess:
        "Fairway accuracy + mid-iron mastery. Narrow fairways and bentgrass greens decide it, not the distance you already have — SG: Approach and putting over driving.",
    },
    {
      id: "mid",
      label: "Mid-tier drivers",
      range: "295.1–310 yards",
      description:
        "Top 40–100. Balanced distribution — 38.9% in 100–150 and 38.9% in 150–200 — with only 16.7% wedges. Pays ~+182 approach yards per round vs elite, roughly a 1-stroke tax.",
      examples: ["Jordan Spieth", "Davis Riley"],
      expectedScore: "−4 to −8 (competitive mid-field)",
      avgApproachYds: 141.8,
      totalApproachYds: 2552,
      keyToSuccess:
        "Find the narrow fairways and stay in the 100–150 comfort zone. The ~1-stroke approach tax is survivable for accurate ball-strikers.",
    },
    {
      id: "bottom",
      label: "Shorter drivers",
      range: "≤ 295 yards",
      description:
        "Outside top 100 in driving distance. 50% of approaches sit in 100–150 (mid-iron dependent) and just 5.6% are wedges. +350 yards/round vs elite ≈ 2 strokes — but with no forced 250+ approaches, precision still wins.",
      examples: ["Russell Henley", "Brian Harman"],
      expectedScore: "−4 to E (top-20 ceiling with hot irons)",
      avgApproachYds: 151.1,
      totalApproachYds: 2720,
      keyToSuccess:
        "Mid-iron play (100–150 yds is half your approaches) and fairway precision. Because nothing forces a long approach, a short hitter with elite irons can crack the top 20.",
    },
  ],
  holes: [
    {
      hole: 1,
      par: 5,
      yards: 565,
      approachYds: { elite: 100, mid: 113, bottom: 125 },
      approachClubs: { elite: "PW / 9i", mid: "9i / 8i", bottom: "8i" },
      strategy:
        "Reachable-ish par 5 to open. Wedge / short-iron third for everyone — a chance to start red. Scoring hole across all tiers.",
      flag: "opportunity",
    },
    {
      hole: 2,
      par: 4,
      yards: 400,
      approachYds: { elite: 85, mid: 98, bottom: 110 },
      approachClubs: { elite: "SW / PW", mid: "PW / 9i", bottom: "9i" },
      strategy:
        "Short par 4 — wedge / short-iron approaches for the whole field. Attack a back pin and take the early birdie look.",
      flag: "opportunity",
    },
    {
      hole: 3,
      par: 4,
      yards: 476,
      approachYds: { elite: 161, mid: 174, bottom: 186 },
      approachClubs: { elite: "7i / 6i", mid: "6i / 5i", bottom: "5i" },
      strategy:
        "First leg of the Horseshoe. Long par 4 into a guarded green — a mid-to-long iron for everyone. Par is a good score; distance buys you nothing here.",
      flag: "penalty",
      keyInsight: "Horseshoe (3-4-5): pure ball-striking, no distance edge.",
    },
    {
      hole: 4,
      par: 3,
      yards: 246,
      approachYds: { elite: 246, mid: 246, bottom: 246 },
      approachClubs: { elite: "3w / hybrid", mid: "3w / hybrid", bottom: "3w / hybrid" },
      strategy:
        "A 246-yard par 3 — the same demanding shot for everyone, often into wind off the river. The hardest tee shot on the course; bail short and take your par.",
      flag: "penalty",
      keyInsight: "246-yd par 3 — the Horseshoe's centerpiece. Survive it.",
    },
    {
      hole: 5,
      par: 4,
      yards: 470,
      approachYds: { elite: 155, mid: 168, bottom: 180 },
      approachClubs: { elite: "7i", mid: "6i", bottom: "5i" },
      strategy:
        "Closes the Horseshoe — a long, tight par 4 with the river left. Mid-long iron in; making par here is gaining on the field.",
      flag: "penalty",
      keyInsight: "Escape 3-4-5 at level par and you've won the hardest stretch.",
    },
    {
      hole: 6,
      par: 4,
      yards: 393,
      approachYds: { elite: 78, mid: 91, bottom: 103 },
      approachClubs: { elite: "SW", mid: "PW / SW", bottom: "PW / 9i" },
      strategy:
        "Relief after the Horseshoe. Wedge / short iron for everyone — the field's best bounce-back birdie chance. Convert.",
      flag: "opportunity",
      keyInsight: "Bounce-back hole — must convert after the Horseshoe.",
    },
    {
      hole: 7,
      par: 4,
      yards: 427,
      approachYds: { elite: 112, mid: 125, bottom: 137 },
      approachClubs: { elite: "9i / 8i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Mid-length par 4. Position off the tee for a short-iron in; a fair hole where accuracy yields a look.",
    },
    {
      hole: 8,
      par: 3,
      yards: 192,
      approachYds: { elite: 192, mid: 192, bottom: 192 },
      approachClubs: { elite: "5i / 4i", mid: "5i / 4i", bottom: "5i / 4i" },
      strategy:
        "Mid-long par 3, same for all. Center the green — the miss long or in the bunkers brings bogey into play.",
    },
    {
      hole: 9,
      par: 4,
      yards: 402,
      approachYds: { elite: 87, mid: 100, bottom: 112 },
      approachClubs: { elite: "SW / PW", mid: "PW", bottom: "9i / 8i" },
      strategy:
        "Short par 4 to close the front. Wedge / short iron in for the whole field — a real birdie opportunity before the turn.",
      flag: "opportunity",
    },
    {
      hole: 10,
      par: 4,
      yards: 404,
      approachYds: { elite: 89, mid: 102, bottom: 114 },
      approachClubs: { elite: "SW / PW", mid: "PW / 9i", bottom: "9i / 8i" },
      strategy:
        "Begins the back with another short-iron hole. Find the fairway and you've got a wedge — keep the round moving.",
      flag: "opportunity",
    },
    {
      hole: 11,
      par: 5,
      yards: 609,
      approachYds: { elite: 144, mid: 157, bottom: 169 },
      approachClubs: { elite: "8i / 7i", mid: "7i", bottom: "6i" },
      strategy:
        "The lone back-nine par 5 and the field's biggest scoring chance — a mid-iron third for everyone after a layup. Make your 4.",
      flag: "opportunity",
      keyInsight: "Par-5 scoring opportunity for the entire field.",
    },
    {
      hole: 12,
      par: 4,
      yards: 433,
      approachYds: { elite: 118, mid: 131, bottom: 143 },
      approachClubs: { elite: "9i / 8i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Mid-length par 4. Short-to-mid iron in; accuracy off the tee sets up a controllable approach.",
    },
    {
      hole: 13,
      par: 3,
      yards: 178,
      approachYds: { elite: 178, mid: 178, bottom: 178 },
      approachClubs: { elite: "6i / 5i", mid: "6i / 5i", bottom: "6i / 5i" },
      strategy:
        "Mid-iron par 3 over trouble. Take the center of the green; this is a par-and-move-on hole.",
    },
    {
      hole: 14,
      par: 4,
      yards: 457,
      approachYds: { elite: 142, mid: 155, bottom: 167 },
      approachClubs: { elite: "8i / 7i", mid: "7i", bottom: "6i" },
      strategy:
        "Longer par 4 into the closing stretch. Mid-iron in — fairway is essential to hold a firm bentgrass green.",
    },
    {
      hole: 15,
      par: 4,
      yards: 430,
      approachYds: { elite: 115, mid: 128, bottom: 140 },
      approachClubs: { elite: "9i / 8i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Mid-length par 4. A short-to-mid iron rewards a fairway; bail-out misses leave awkward angles into a small green.",
    },
    {
      hole: 16,
      par: 3,
      yards: 188,
      approachYds: { elite: 188, mid: 188, bottom: 188 },
      approachClubs: { elite: "5i", mid: "5i", bottom: "5i" },
      strategy:
        "The last par 3 — mid-long iron, same for all. Wind and a shallow green make distance control king.",
    },
    {
      hole: 17,
      par: 4,
      yards: 383,
      approachYds: { elite: 68, mid: 81, bottom: 93 },
      approachClubs: { elite: "SW", mid: "SW / PW", bottom: "PW / 9i" },
      strategy:
        "Short par 4 — the field's last clear birdie look. Wedge in for everyone; a Sunday pin here decides charges.",
      flag: "opportunity",
      keyInsight: "Sunday birdie hole — wedge in for the whole field.",
    },
    {
      hole: 18,
      par: 4,
      yards: 427,
      approachYds: { elite: 112, mid: 125, bottom: 137 },
      approachClubs: { elite: "9i / 8i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Demanding finisher — a tight tee shot to a fairway pinched by trees and water, then a short-mid iron to a well-guarded green. Par closes a good round.",
    },
  ],
  penaltyHoles: [3, 4, 5],
  opportunityHoles: [1, 2, 6, 9, 10, 11, 17],
  bettingAngles: [
    {
      title: "Back accurate ball-strikers over bombers",
      tone: "fit",
      body: "Colonial is a precision course: SG: Approach and driving accuracy correlate with success here, raw distance does not. Lean into proven Hogan's-Alley form and elite iron players — the winner is a ball-striker who finds the narrow fairways, not the longest hitter.",
    },
    {
      title: "Fade pure distance without accuracy",
      tone: "fade",
      body: "Long hitters who spray it gain nothing — no approach all week exceeds 250 yards, so there's no reachable advantage, and the tree-lined fairways punish the miss. Be skeptical of distance-merchant outrights who don't rank well in accuracy / SG: Approach.",
    },
    {
      title: "Short, precise hitters are value in top-20/30",
      tone: "fit",
      body: "Shorter drivers can post −4 to even with hot mid-iron play — enough to crack the top 20. Their outright prices undervalue precision; target accurate short hitters in top-20 / top-30 and matchup markets rather than outright.",
    },
    {
      title: "The Horseshoe (3-4-5) drives bogey props",
      tone: "prop",
      body: "Three of the hardest holes back-to-back — a 476-yd par 4, a 246-yd par 3, and a 470-yd par 4 — with no distance relief. Bogey-or-worse and over-par-stretch angles have an edge here. Flip it on the scoring holes: birdie props lean over on 1, 6, 9, 11, and 17.",
    },
    {
      title: "Weight your model to accuracy + approach, not distance",
      tone: "general",
      body: "Adjust DFS / ownership and matchup weights: driving accuracy and SG: Approach up, driving distance down. Distance-proxy players are mispricing themselves into this field.",
    },
  ],
  verdict:
    "Colonial is a precision course, full stop. The winner will be a sharp iron player who finds the narrow fairways and survives the 3-4-5 Horseshoe — not the biggest hitter. Build cards around accurate ball-strikers and proven Colonial form; short hitters with elite approach play are live, while distance merchants without control are not.",
};
