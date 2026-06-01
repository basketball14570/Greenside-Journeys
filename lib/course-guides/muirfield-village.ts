import type { CourseGuide } from "./types";

// 2026 Memorial Tournament — Muirfield Village Golf Club.
// Draft built from publicly known Muirfield Village characteristics:
// Nicklaus 1974 design hosting the Memorial since 1976, par 72 with
// par-3s on 4/8/12/16 and par-5s on 5/7/11/15, fast bentgrass greens
// with Kentucky bluegrass rough. Total 7,569 yards post-2021 renovation.
//
// Yardages verified from public sources for holes 1 (470), 2 (455),
// 4 (210), 5 (527), 7 (563), 11 (567), 12 (184), 14 (363), 15 (529),
// 18 (484). Holes 3, 6, 8, 9, 10, 13, 16, 17 use post-renovation
// educated estimates and SHOULD BE CROSS-CHECKED against
// https://www.pgatour.com/tournaments/2026/the-memorial-tournament-presented-by-workday/R2026023/course-stats
// before the guide goes public.
//
// Publishes Sunday evening, 4 days before Thursday tee-off.

export const MUIRFIELD_VILLAGE: CourseGuide = {
  slug: "muirfield-village",
  publishedAt: "2026-05-31T22:00:00Z",
  tournamentStartsAt: "2026-06-04T13:00:00Z",
  tournament: "the Memorial Tournament",
  dates: "June 4–7, 2026",
  courseName: "Muirfield Village Golf Club",
  location: "Dublin, OH",
  designer: "Jack Nicklaus",
  established: 1974,
  par: 72,
  yards: 7569,
  courseRating: 76.0,
  slope: 145,
  greens: "Bentgrass",
  fairways: "Bentgrass (Kentucky bluegrass rough)",
  difficultyRank: "Major-grade par 72 — among the toughest non-major setups",
  waterOnHoles: 13,
  headline: "Jack's masterpiece — a major in everything but name.",
  tldr:
    "Muirfield Village is the closest a non-major gets to major conditions: firm, fast bentgrass greens, narrow tree-lined fairways, water in play on most of the back nine, and a finishing stretch built to swing a tournament. Winning scores cluster in the −10 to −18 range and reward the same skill stack as a U.S. Open prep week — elite ball-striking, distance control on approaches, and survival on the par 3s. The course history list at Memorial is short and repeats: Nicklaus designed it for shotmakers and that's who keeps winning.",
  skillStack: [
    "Strokes Gained: Approach (firm, fast greens)",
    "Strokes Gained: Tee-to-Green (overall ball-striking)",
    "Driving accuracy (tree-lined corridors)",
    "Putting (bentgrass speed control)",
    "Around-the-green scrambling",
  ],
  tiers: [
    {
      id: "elite",
      label: "Elite drivers",
      range: "310+ yards",
      description:
        "Top-40 Tour drivers. Distance helps on the long par 4s (10, 13, 17) and the reachable par 5s (5, 11, 15), but Muirfield's tree corridors punish a missed line — distance without accuracy isn't a true edge here.",
      examples: ["Rory McIlroy", "Ludvig Aberg", "Aldrich Potgieter"],
      expectedScore: "−12 to −18 (winning range −12 to −15)",
      avgApproachYds: 168,
      totalApproachYds: 3024,
      keyToSuccess:
        "Find fairways, take the look on the reachable par 5s, and hit the long par 4s with controllable mid-irons. The bonus distance only matters if it stays between the trees.",
    },
    {
      id: "mid",
      label: "Mid-tier drivers",
      range: "295–310 yards",
      description:
        "Top 40–100 in driving distance. Pays roughly +180 approach yards a round vs elite — a ~1.5-stroke premium on this course because mid-iron precision is the dominant skill anyway.",
      examples: ["Scottie Scheffler", "Patrick Cantlay", "Viktor Hovland"],
      expectedScore: "−8 to −14 (legitimate winning tier with elite irons)",
      avgApproachYds: 180,
      totalApproachYds: 3240,
      keyToSuccess:
        "Iron play decides it. Mid-tier ball-strikers like Scheffler / Cantlay / Hovland have won here repeatedly without leading the field in distance — they led in approach.",
    },
    {
      id: "bottom",
      label: "Bottom-tier drivers",
      range: "≤ 295 yards",
      description:
        "Outside top-100 in driving distance. ~300 yards a round of extra approach work — a ~2.5-stroke tax on a course where every iron is into a firm bentgrass green. Margin for error is thin.",
      examples: ["Russell Henley", "Brian Harman"],
      expectedScore: "−4 to −10 (top-20 ceiling)",
      avgApproachYds: 192,
      totalApproachYds: 3456,
      keyToSuccess:
        "Elite mid-to-long iron play. Short hitters with cold approaches struggle; short hitters with hot mid-irons can crack the top-15.",
    },
  ],
  // TODO: per-hole yardages for holes 3, 6, 8, 9, 10, 13, 16, 17 are
  // post-renovation educated estimates and currently sum to ~146 yards
  // less than the verified 7,569 course total. Replace with the official
  // 2026 Memorial setup before publish (link in file header). Approach
  // yardages and clubs scale linearly with hole length so update them
  // too when the source yardage moves.
  holes: [
    {
      hole: 1,
      par: 4,
      yards: 470,
      approachYds: { elite: 160, mid: 172, bottom: 185 },
      approachClubs: { elite: "7i / 6i", mid: "6i", bottom: "5i" },
      strategy:
        "Demanding par-4 opener. Mid-to-long iron in to a firm green — a 4 is a strong start.",
    },
    {
      hole: 2,
      par: 4,
      yards: 455,
      approachYds: { elite: 145, mid: 157, bottom: 170 },
      approachClubs: { elite: "8i / 7i", mid: "7i", bottom: "6i" },
      strategy:
        "Another full-iron par 4. Fairway is essential to hold the green; no relief from distance off the tee.",
    },
    {
      hole: 3,
      par: 4,
      yards: 411,
      approachYds: { elite: 100, mid: 113, bottom: 125 },
      approachClubs: { elite: "PW / 9i", mid: "9i / 8i", bottom: "8i" },
      strategy:
        "First clear scoring chance. Short iron in for the whole field — a birdie look that the leaders convert.",
      flag: "opportunity",
    },
    {
      hole: 4,
      par: 3,
      yards: 210,
      approachYds: { elite: 210, mid: 210, bottom: 210 },
      approachClubs: { elite: "5i / 4i", mid: "5i / 4i", bottom: "5i / 4i" },
      strategy:
        "Demanding 210-yard par 3 — same shot for everyone. Center of green is the play; the miss long or right brings bogey into the picture. Green was rebuilt in 2021 to receive shots better.",
    },
    {
      hole: 5,
      par: 5,
      yards: 527,
      approachYds: { elite: 220, mid: 235, bottom: 252 },
      approachClubs: { elite: "3w / hybrid", mid: "3w", bottom: "3w" },
      strategy:
        "Reachable par 5 for the long hitters and a comfortable layup for the rest. Front-nine scoring hole — make a 4.",
      flag: "opportunity",
    },
    {
      hole: 6,
      par: 4,
      yards: 447,
      approachYds: { elite: 137, mid: 150, bottom: 162 },
      approachClubs: { elite: "9i / 8i", mid: "8i / 7i", bottom: "7i" },
      strategy:
        "Mid-length par 4. Mid-iron in — fair, but a missed fairway is rough-rescue with limited spin control on a firm green.",
    },
    {
      hole: 7,
      par: 5,
      yards: 563,
      approachYds: { elite: 130, mid: 145, bottom: 160 },
      approachClubs: { elite: "9i / 8i", mid: "8i / 7i", bottom: "7i" },
      strategy:
        "Long par 5 — reachable for the elite tier off a perfect drive, comfortable 3-shotter for the rest. Either way the field gets a real birdie look on the third shot.",
      flag: "opportunity",
      keyInsight: "Scoring chance for everyone — convert a 4.",
    },
    {
      hole: 8,
      par: 3,
      yards: 182,
      approachYds: { elite: 182, mid: 182, bottom: 182 },
      approachClubs: { elite: "7i / 6i", mid: "7i / 6i", bottom: "7i / 6i" },
      strategy:
        "Mid par 3, same for everyone. Take the center, take your par, head to 9.",
    },
    {
      hole: 9,
      par: 4,
      yards: 412,
      approachYds: { elite: 102, mid: 115, bottom: 127 },
      approachClubs: { elite: "PW", mid: "9i", bottom: "9i / 8i" },
      strategy:
        "Short-iron par 4 to close the front. Wedge in for the leaders — a real birdie chance before the turn.",
      flag: "opportunity",
    },
    {
      hole: 10,
      par: 4,
      yards: 471,
      approachYds: { elite: 161, mid: 173, bottom: 186 },
      approachClubs: { elite: "7i", mid: "6i", bottom: "5i / hybrid" },
      strategy:
        "Brutal par-4 opener for the back. Long iron / hybrid for shorter hitters — par is gaining ground.",
      flag: "penalty",
    },
    {
      hole: 11,
      par: 5,
      yards: 567,
      approachYds: { elite: 232, mid: 247, bottom: 263 },
      approachClubs: { elite: "3w / hybrid", mid: "3w", bottom: "3w / layup" },
      strategy:
        "Reachable for the elite, easy 3-shotter for the rest. Either way the field's best back-nine scoring chance — convert.",
      flag: "opportunity",
      keyInsight: "Back-nine scoring hole #1 — make your 4.",
    },
    {
      hole: 12,
      par: 3,
      yards: 184,
      approachYds: { elite: 184, mid: 184, bottom: 184 },
      approachClubs: { elite: "7i / 6i", mid: "7i / 6i", bottom: "7i / 6i" },
      strategy:
        "Mid par 3 over water — wind off the pond firms up distance control. Center pin, exit at par.",
      flag: "penalty",
      keyInsight: "Water short — bogey in play on a windy day.",
    },
    {
      hole: 13,
      par: 4,
      yards: 455,
      approachYds: { elite: 145, mid: 157, bottom: 170 },
      approachClubs: { elite: "8i / 7i", mid: "7i", bottom: "6i" },
      strategy:
        "Mid-long par 4 — fairway essential, full iron in. Defensive hole; par is winning.",
    },
    {
      hole: 14,
      par: 4,
      yards: 363,
      approachYds: { elite: 90, mid: 103, bottom: 115 },
      approachClubs: { elite: "SW / PW", mid: "PW", bottom: "PW / 9i" },
      strategy:
        "Short par 4 — driver tempts everyone, creek crosses ~270 out. Aggressive line, wedge in; the tournament's signature risk/reward.",
      flag: "opportunity",
      keyInsight: "Sunday gamble hole — wedge looks reward the brave tee shot.",
    },
    {
      hole: 15,
      par: 5,
      yards: 529,
      approachYds: { elite: 219, mid: 234, bottom: 251 },
      approachClubs: { elite: "3w / hybrid", mid: "3w", bottom: "3w" },
      strategy:
        "Reachable par 5 with water guarding the green — go-for-it for the bombers, lay up for placement otherwise. Make 4.",
      flag: "opportunity",
      keyInsight: "Back-nine scoring hole #2 — eagle in play for the long.",
    },
    {
      hole: 16,
      par: 3,
      yards: 215,
      approachYds: { elite: 215, mid: 215, bottom: 215 },
      approachClubs: { elite: "5i / 4i", mid: "5i / 4i", bottom: "5i / 4i" },
      strategy:
        "Long par 3 — same hard shot for all. Bunkers right, water short and left; this is where rounds quietly turn.",
      flag: "penalty",
      keyInsight: "Hardest par 3 on the course — par is gaining strokes.",
    },
    {
      hole: 17,
      par: 4,
      yards: 478,
      approachYds: { elite: 168, mid: 180, bottom: 193 },
      approachClubs: { elite: "7i / 6i", mid: "6i", bottom: "5i" },
      strategy:
        "Long par 4 with a demanding approach into a tucked green. Mid-long iron in — keep the round alive before 18.",
      flag: "penalty",
    },
    {
      hole: 18,
      par: 4,
      yards: 484,
      approachYds: { elite: 174, mid: 187, bottom: 199 },
      approachClubs: { elite: "7i / 6i", mid: "6i", bottom: "5i / hybrid" },
      strategy:
        "Iconic Nicklaus finisher — a 484-yard par 4 with creek down the left of the fairway and water front of the green, grandstand framing the back. Mid-long iron in to a tucked green — par is a Sunday win.",
      keyInsight: "Sunday drama hole — water in play on both shots; bogey decides tournaments.",
    },
  ],
  penaltyHoles: [10, 12, 16, 17],
  opportunityHoles: [3, 5, 7, 9, 11, 14, 15],
  bettingAngles: [
    {
      title: "Back proven Memorial form",
      tone: "fit",
      body: "Few courses on Tour repeat winners and contenders like Muirfield Village — Scheffler, Cantlay, Hovland, Tiger historically. Course history here is one of the few signals that consistently survives the noise. Weight Memorial-specific finishes heavily in your model.",
    },
    {
      title: "Lean on elite Strokes Gained: Approach",
      tone: "fit",
      body: "Firm, fast bentgrass greens force precise distance control; the long par 4s (1, 2, 10, 13, 17) demand full-iron approaches into small targets. Top-20 SG: APP players win this event, almost without exception. Build outright and top-10 cards around iron play, not power.",
    },
    {
      title: "Fade pure distance without accuracy",
      tone: "fade",
      body: "Tree-lined corridors and small, firm greens mean a 320-yard drive in the rough is a worse position than a 290-yard drive in the fairway. Long but spray-prone drivers consistently underperform their odds here.",
    },
    {
      title: "Par-3 bogey-or-worse props on 4, 12, 16",
      tone: "prop",
      body: "Three demanding par 3s with water and wind in play. Bogey-or-worse props on the long par 3s (especially 16) carry edge over the field, and 'O 0.5 bogeys on hole X' specifically is a clean angle in an afternoon wave.",
    },
    {
      title: "Reachable-par-5 birdies-or-better leans over",
      tone: "prop",
      body: "Holes 5, 11, and 15 are the field's three best birdie chances. R1-R4 birdies-or-better counts of 2+ in any round are well-priced unders relative to base rate on this course's par 5s.",
    },
    {
      title: "Sunday 14 is the swing hole",
      tone: "general",
      body: "Short par 4 with a creek that crosses ~270 — the leaders' decision tree changes by Sunday. Watch the tee shot strategy on 14 as a live signal: aggressive lines from chasers, conservative from leaders.",
    },
  ],
  verdict:
    "Muirfield Village is a ball-striker's course masquerading as a complete test. The list of repeat contenders is short and predictable — Scheffler, Cantlay, Hovland, and the Memorial-form-veterans — because the conditions reward precise mid-iron play above almost everything else. Build outright cards around elite SG: Approach with course history; fade pure distance without accuracy; and expect a winning score in the −12 to −15 range, settled on the back nine.",
};
