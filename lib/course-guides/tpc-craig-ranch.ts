import type { CourseGuide } from "./types";

// 2026 CJ Cup Byron Nelson — TPC Craig Ranch.
// Source: course guide doc, condensed analysis doc.
// Publishes Sunday evening, 4 days before Thursday tee-off.

export const TPC_CRAIG_RANCH: CourseGuide = {
  slug: "tpc-craig-ranch",
  publishedAt: "2026-05-17T22:00:00Z",
  tournamentStartsAt: "2026-05-21T13:00:00Z",
  tournament: "CJ Cup Byron Nelson",
  dates: "May 21–24, 2026",
  courseName: "TPC Craig Ranch",
  location: "McKinney, TX",
  designer: "Tom Weiskopf",
  established: 2004,
  par: 71,
  yards: 7569,
  courseRating: 76.7,
  slope: 147,
  greens: "Bentgrass",
  fairways: "Bermudagrass",
  difficultyRank: "45th easiest on Tour",
  waterOnHoles: 9,
  headline: "An iron-play course masquerading as a bombers' track.",
  tldr:
    "TPC Craig Ranch plays easier than 7,569 yards suggests — fairways are wide, water's avoidable, and the 5 par 3s neutralize distance. The catch: 5 long par 4s (466-512 yds) force shorter hitters into 200+ yard approaches on nearly half their holes. Elite drivers win by attacking par 5s and managing long irons; bottom-tier players cash by excelling on the wedges they do get (holes 6, 14) and holding par on the brutes.",
  heroImage: "/course-guides/tpc-craig-ranch-18.jpg",
  skillStack: [
    "Strokes Gained: Approach",
    "Putting (bentgrass, undulating)",
    "Course management (angles into greens)",
    "Long iron / hybrid execution",
  ],
  tiers: [
    {
      id: "elite",
      label: "Elite drivers",
      range: "310+ yards",
      description:
        "Top-40 PGA Tour drivers. Get a mid-iron into 44% of greens — the most natural approach distance for tour pros — and a wedge into 22% of par 4s. Long irons only required on 16.7% of holes.",
      examples: ["Scottie Scheffler", "Si Woo Kim", "Brooks Koepka", "Rory McIlroy", "Jon Rahm"],
      expectedScore: "−23 to −26 (winning range)",
      avgApproachYds: 150.9,
      totalApproachYds: 2716,
      keyToSuccess:
        "Iron play + putting. SG: Approach and SG: Putting matter more than driving distance you already have.",
    },
    {
      id: "mid",
      label: "Mid-tier drivers",
      range: "295.1–310 yards",
      description:
        "Top 40-100. Balanced distribution — 61% of approaches between 100-200 yards. Pays a ~+175 yard tax per round vs elite and faces 200+ yard approaches on 28% of holes.",
      examples: ["Rasmus Højgaard", "Pierceson Coody", "Eric Cole", "Karl Vilips"],
      expectedScore: "−16 to −20 (competitive mid-field)",
      avgApproachYds: 160.6,
      totalApproachYds: 2891,
      keyToSuccess:
        "Long iron execution + course management. Penalty is ≈1 stroke per round vs elite — survivable.",
    },
    {
      id: "bottom",
      label: "Shorter drivers",
      range: "≤ 295 yards",
      description:
        "Outside top 100 in driving distance. 44% of approaches require long iron or hybrid (vs. 16.7% for elite). +343 yds/round of additional approach work — ≈2 strokes of drag.",
      examples: ["Andrew Putnam", "Aaron Wise"],
      expectedScore: "−8 to −14",
      avgApproachYds: 169.9,
      totalApproachYds: 3059,
      keyToSuccess:
        "Hybrid / long iron excellence + par 5 attack + wedge execution on holes 6, 14. Hold par on the 5 long par 4s and get aggressive everywhere else.",
    },
  ],
  holes: [
    {
      hole: 1,
      par: 4,
      yards: 431,
      approachYds: { elite: 116, mid: 129, bottom: 141 },
      approachClubs: { elite: "PW / 9i", mid: "8i", bottom: "7i" },
      strategy:
        "Moderate opener. Drive for position on the right. All three tiers get reasonable approaches — a chance to get to red numbers early.",
      flag: "opportunity",
    },
    {
      hole: 2,
      par: 4,
      yards: 466,
      approachYds: { elite: 151, mid: 164, bottom: 176 },
      approachClubs: { elite: "5i", mid: "6i", bottom: "5i" },
      strategy:
        "First long par 4 — separates the field by driving distance. Elite get a manageable long iron, bottom tier face 176 yards.",
      flag: "penalty",
      keyInsight: "First test of long-iron play for shorter hitters.",
    },
    {
      hole: 3,
      par: 4,
      yards: 420,
      approachYds: { elite: 105, mid: 118, bottom: 130 },
      approachClubs: { elite: "PW", mid: "8i", bottom: "7i" },
      strategy:
        "Straightforward par 4. No major hazards in play for good drives. Bounce-back hole after #2.",
      flag: "opportunity",
    },
    {
      hole: 4,
      par: 3,
      yards: 219,
      approachYds: { elite: 219, mid: 219, bottom: 219 },
      approachClubs: { elite: "4-5i", mid: "4i", bottom: "3i" },
      strategy:
        "Mid-range par 3 — same shot for everyone. Water down left, bunkers right. Best miss is short or left.",
    },
    {
      hole: 5,
      par: 5,
      yards: 635,
      approachYds: { elite: 170, mid: 183, bottom: 195 },
      approachClubs: { elite: "5i (after layup)", mid: "5i", bottom: "4i" },
      strategy:
        "Drivable for elite after layup. The par 5s are the great equalizer here — shorter hitters can score.",
      flag: "opportunity",
      keyInsight: "Par 5 opportunity for entire field.",
    },
    {
      hole: 6,
      par: 4,
      yards: 361,
      approachYds: { elite: 50, mid: 59, bottom: 71 },
      approachClubs: { elite: "GW/SW", mid: "GW/SW", bottom: "PW / 9i" },
      strategy:
        "Bonus hole. Short par 4 yields wedge / short-iron approaches across the board. Attack.",
      flag: "opportunity",
      keyInsight: "One of only TWO par 4s where bottom tier gets a wedge.",
    },
    {
      hole: 7,
      par: 3,
      yards: 232,
      approachYds: { elite: 232, mid: 232, bottom: 232 },
      approachClubs: { elite: "4-5i", mid: "4i", bottom: "3i" },
      strategy:
        "Sleeper par 3. Wind exposure is real and the false front is severe — short shots get rejected hard.",
    },
    {
      hole: 8,
      par: 4,
      yards: 509,
      approachYds: { elite: 194, mid: 207, bottom: 219 },
      approachClubs: { elite: "3-4i", mid: "2-3i", bottom: "Hybrid" },
      strategy:
        "Major penalty hole. 2nd longest par 4 on course. Mid-tier faces 207-yard very long iron; bottom tier facing 219 yards.",
      flag: "penalty",
    },
    {
      hole: 9,
      par: 5,
      yards: 564,
      approachYds: { elite: 99, mid: 112, bottom: 124 },
      approachClubs: { elite: "PW/AW", mid: "AW/SW", bottom: "9i/PW" },
      strategy:
        "Par 5 finishing the front 9. Wide fairway, large green. Even bottom tier gets a short iron in — scoring hole for everyone.",
      flag: "opportunity",
    },
    {
      hole: 10,
      par: 4,
      yards: 491,
      approachYds: { elite: 176, mid: 189, bottom: 201 },
      approachClubs: { elite: "5i", mid: "4i", bottom: "2-3i / Hybrid" },
      strategy:
        "Long par 4 — the back-9 grind begins. Shorter drivers facing 201 yards puts them in major-disadvantage territory.",
      flag: "penalty",
    },
    {
      hole: 11,
      par: 4,
      yards: 467,
      approachYds: { elite: 152, mid: 165, bottom: 177 },
      approachClubs: { elite: "5i", mid: "6i", bottom: "5i" },
      strategy:
        "Another long par 4. Elite get a comfortable iron, bottom tier face 177 yards.",
      flag: "penalty",
    },
    {
      hole: 12,
      par: 4,
      yards: 493,
      approachYds: { elite: 178, mid: 191, bottom: 203 },
      approachClubs: { elite: "5i", mid: "4i", bottom: "Hybrid" },
      strategy:
        "Major penalty hole. Mid-tier 191-yard long iron, bottom 203 — extremely difficult to reach in regulation.",
      flag: "penalty",
    },
    {
      hole: 13,
      par: 4,
      yards: 512,
      approachYds: { elite: 197, mid: 210, bottom: 222 },
      approachClubs: { elite: "4i", mid: "2-3i", bottom: "Hybrid / 3w" },
      strategy:
        "Longest par 4 — the killer hole. Shorter drivers facing 222 yards is essentially impossible to reach in regulation.",
      flag: "penalty",
      keyInsight: "The killer. Make a 4 here and you've gained on the field.",
    },
    {
      hole: 14,
      par: 4,
      yards: 362,
      approachYds: { elite: 50, mid: 60, bottom: 72 },
      approachClubs: { elite: "GW/SW", mid: "GW/SW", bottom: "PW" },
      strategy:
        "Relief hole after the brutal 13. Wedges across the board. Critical bounce-back opportunity.",
      flag: "opportunity",
      keyInsight: "Bounce-back hole — must convert after a tough stretch.",
    },
    {
      hole: 15,
      par: 3,
      yards: 216,
      approachYds: { elite: 216, mid: 216, bottom: 216 },
      approachClubs: { elite: "4-5i", mid: "4i", bottom: "3i" },
      strategy:
        "Water left, bunkers right. Green has a ridge creating two tiers — pin-hunting punished.",
    },
    {
      hole: 16,
      par: 4,
      yards: 492,
      approachYds: { elite: 177, mid: 190, bottom: 202 },
      approachClubs: { elite: "5i", mid: "4i", bottom: "2-3i / Hybrid" },
      strategy:
        "Another long par 4. The elite-advantage pattern continues — fifth time in 14 holes the bottom tier faces 200+.",
      flag: "penalty",
    },
    {
      hole: 17,
      par: 3,
      yards: 147,
      approachYds: { elite: 147, mid: 147, bottom: 147 },
      approachClubs: { elite: "PW / 9i", mid: "PW / 9i", bottom: "PW / 9i" },
      strategy:
        "Shortest par 3. Signature hole. Best miss short or left — bogey risk if you get cute with the pin.",
      flag: "opportunity",
    },
    {
      hole: 18,
      par: 5,
      yards: 552,
      approachYds: { elite: 87, mid: 100, bottom: 112 },
      approachClubs: { elite: "SW", mid: "AW/SW", bottom: "9i/PW" },
      strategy:
        "Par 5 finisher. Large landing area. All tiers can birdie — the closer for any Sunday charge.",
      flag: "opportunity",
      keyInsight: "Sunday charges happen here. All tiers should target birdie.",
    },
  ],
  penaltyHoles: [2, 8, 10, 12, 13, 16],
  opportunityHoles: [5, 6, 9, 14, 18],
  bettingAngles: [
    {
      title: "Fade short hitters in outright markets",
      tone: "fade",
      body: "+343 yds/round of extra approach work for sub-295 drivers = roughly 2 strokes of drag. Winners almost always come from the elite tier. Be skeptical of any outright price on a player ranked outside the top 100 in driving distance unless they're elite with the irons.",
    },
    {
      title: "Top-20 / Top-30 plays are where bottom-tier earns its keep",
      tone: "fit",
      body: "Shorter drivers can post -8 to -14 here — competitive enough to crack the top 20 in soft conditions. Wedge specialists and par-5 attackers (Putnam-type profiles) get sharper top-30 prices than top-10.",
    },
    {
      title: "Round-prop birdies tilt over",
      tone: "prop",
      body: "Wide fairways, generous bermuda, 3 par 5s, and two short par 4s (#6, #14) compress the birdie distribution upward. 4.5 and 5.5 birdie lines have history of going over. Pair with the par-5 reachable in two crowd.",
    },
    {
      title: "Matchups: bias toward the longer driver",
      tone: "fit",
      body: "When two players have similar SG: Approach, the 10-15 yard driver-distance edge translates into 25 yards on approach across 5 holes. Elite-vs-mid h2h: lean elite. Mid-vs-bottom: lean mid. Don't chase price — chase the iron the player will be holding.",
    },
    {
      title: "Approach-game leans, not driving-accuracy leans",
      tone: "general",
      body: "This is NOT a fairways-hit course (fairways are wide). It IS a strokes-gained-approach course. Adjust your ownership / DFS optimizer weights accordingly — accuracy proxies and FIR-leaning players are pricing themselves in incorrectly.",
    },
  ],
  verdict:
    "TPC Craig Ranch moderately penalizes short hitters — not severely. The +343 yds/round vs elite translates to about 2 strokes of drag, but par 5s, par 3s, and wedge holes 6/14 give the bottom tier room to compete. Build your card around elite ball-strikers and wedge specialists; the 5 long par 4s are the swing factor.",
};
