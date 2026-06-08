import type { CourseGuide } from "./types";

// 2026 RBC Canadian Open — TPC Toronto at Osprey Valley (Heathlands course).
// Par 70, 7,389 yards. Doug Carrick design, opened 2001. Hosted the
// Canadian Open since 2023 (Nick Taylor's home-soil playoff win), with
// Robert MacIntyre winning in 2024.
//
// Per-hole pars + yardages verified against the PGA Tour 2026
// course-stats data the operator pulled (front 3,645, back 3,744,
// total 7,389). The unusual setup — 4 par 3s and only 2 par 5s, with
// twelve par 4s including three at 497+ — drives the entire strategic
// read.
//
// Publishes Sunday evening (June 7), 4 days before Thursday tee-off.

export const TPC_TORONTO_AT_OSPREY_VALLEY: CourseGuide = {
  slug: "tpc-toronto-at-osprey-valley",
  publishedAt: "2026-06-07T22:00:00Z",
  tournamentStartsAt: "2026-06-11T13:00:00Z",
  tournament: "RBC Canadian Open",
  dates: "June 11–14, 2026",
  courseName: "TPC Toronto at Osprey Valley",
  location: "Caledon, ON",
  designer: "Doug Carrick",
  established: 2001,
  par: 70,
  yards: 7389,
  courseRating: 75.5,
  slope: 144,
  greens: "Bentgrass",
  fairways: "Bentgrass",
  difficultyRank: "Long par 70 — twelve par 4s with three at 497+ yards",
  waterOnHoles: 8,
  headline: "A par 70 built for bombers — twelve par 4s, three of them 497+.",
  tldr:
    "Osprey Valley's Heathlands course is an unusual par 70: only two par 5s and four par 3s, with twelve par 4s — three of them at 497+ yards (5, 9, 17) and another two at 513 and 526. That setup makes distance a real edge, because shorter hitters are facing long irons and hybrids into firm greens for half the round. Winning scores cluster −14 to −18 (MacIntyre at −16 in 2024, Taylor at −17 in 2023) because the par 3s split — 4 and 14 are scorable; 7 and 11 are defensive 225+ — and the two par 5s are both gettable for the long. Build around drivers who can also handle 200+ approach shots, fade pure short-game scramblers without distance.",
  skillStack: [
    "Driving distance (long par 4s + scorable par 5s)",
    "Long iron / hybrid play (3 par 4s over 510, 2 par 3s over 220)",
    "Strokes Gained: Approach (bentgrass control)",
    "Putting (bentgrass — cool-climate speed)",
    "Course management on the par-3 split",
  ],
  tiers: [
    {
      id: "elite",
      label: "Elite drivers",
      range: "310+ yards",
      description:
        "Top-40 Tour drivers. Distance is a real edge here — they reach the par 5s in two, hit short-to-mid irons into the long par 4s, and turn 526-yard hole 13 into a wedge with a perfect tee shot. The course rewards bombers without forcing them through narrow corridors.",
      examples: ["Rory McIlroy", "Cameron Young", "Ludvig Aberg"],
      expectedScore: "−12 to −18 (winning range −14 to −18)",
      avgApproachYds: 168,
      totalApproachYds: 3024,
      keyToSuccess:
        "Maximize the par-5 birdie chances (1, 18) and avoid bogeys on the long par 3s (7, 11). With short irons into the field's long par 4s, the path to −16 is open.",
    },
    {
      id: "mid",
      label: "Mid-tier drivers",
      range: "295–310 yards",
      description:
        "Top 40–100 in driving distance. Pays roughly +180 approach yards a round vs elite — and on a course where four par 4s already require mid-iron approaches, that tax compounds. Mid-iron precision keeps them in striking range.",
      examples: ["Robert MacIntyre", "Sungjae Im", "Mackenzie Hughes"],
      expectedScore: "−8 to −14 (legitimate winning tier — MacIntyre won here in 2024)",
      avgApproachYds: 182,
      totalApproachYds: 3276,
      keyToSuccess:
        "Make the par 5s count, hit the green on the long par 3s, and don't bleed strokes to bogey on holes 5, 9, 13, 17. The winning template here is hot mid-iron play, not bombing.",
    },
    {
      id: "bottom",
      label: "Shorter drivers",
      range: "≤ 295 yards",
      description:
        "Outside top-100 in driving distance. Facing ~300 yards a round of extra approach work on a course where three par 4s are already 500+ — that's hybrid/long-iron into firm bentgrass greens, repeatedly. The margin for error is brutal.",
      examples: ["Russell Henley", "Brian Harman"],
      expectedScore: "−4 to −10 (top-15 ceiling on a hot iron week)",
      avgApproachYds: 195,
      totalApproachYds: 3510,
      keyToSuccess:
        "Elite long-iron play and lights-out putting. Without one or the other, the long par 4s grind the round down by Sunday.",
    },
  ],
  holes: [
    {
      hole: 1,
      par: 5,
      yards: 542,
      approachYds: { elite: 232, mid: 247, bottom: 257 },
      approachClubs: { elite: "3w / hybrid", mid: "3w", bottom: "3w" },
      strategy:
        "Reachable par 5 to open — birdie chance for the entire field, eagle in play for the long. Start with a 4.",
      flag: "opportunity",
      keyInsight: "Front-9 scoring hole #1 — convert.",
    },
    {
      hole: 2,
      par: 4,
      yards: 481,
      approachYds: { elite: 171, mid: 186, bottom: 196 },
      approachClubs: { elite: "6i", mid: "6i / 5i", bottom: "5i" },
      strategy:
        "Long par 4. Mid-to-long iron in for everyone — fairway essential to hold a firm green.",
    },
    {
      hole: 3,
      par: 4,
      yards: 440,
      approachYds: { elite: 130, mid: 145, bottom: 155 },
      approachClubs: { elite: "9i / 8i", mid: "8i / 7i", bottom: "7i" },
      strategy:
        "Mid-length par 4 — short-to-mid iron in. A look at birdie if the tee shot finds the fairway.",
    },
    {
      hole: 4,
      par: 3,
      yards: 158,
      approachYds: { elite: 158, mid: 158, bottom: 158 },
      approachClubs: { elite: "PW / 9i", mid: "PW / 9i", bottom: "PW / 9i" },
      strategy:
        "Short par 3 — wedge in for all. One of the field's three best birdie chances, full stop.",
      flag: "opportunity",
      keyInsight: "Shortest par 3 — birdies expected, bogeys leak strokes.",
    },
    {
      hole: 5,
      par: 4,
      yards: 497,
      approachYds: { elite: 187, mid: 202, bottom: 212 },
      approachClubs: { elite: "5i", mid: "5i / hybrid", bottom: "hybrid / 5w" },
      strategy:
        "Brutal 497-yard par 4 — long iron / hybrid in. Par is gaining ground on the field.",
      flag: "penalty",
    },
    {
      hole: 6,
      par: 4,
      yards: 350,
      approachYds: { elite: 40, mid: 55, bottom: 65 },
      approachClubs: { elite: "SW", mid: "SW", bottom: "SW" },
      strategy:
        "Short par 4 — drivable for the elite, wedge in for everyone else. Aggressive look at birdie.",
      flag: "opportunity",
      keyInsight: "Drivable par 4 — eagle in play, birdie expected.",
    },
    {
      hole: 7,
      par: 3,
      yards: 237,
      approachYds: { elite: 237, mid: 237, bottom: 237 },
      approachClubs: { elite: "3i / hybrid", mid: "hybrid", bottom: "hybrid / 5w" },
      strategy:
        "Brutal 237-yard par 3 — long iron / hybrid for all. Center of green, take your par.",
      flag: "penalty",
      keyInsight: "Hardest par 3 on the course — par gains 0.3+ strokes.",
    },
    {
      hole: 8,
      par: 4,
      yards: 440,
      approachYds: { elite: 130, mid: 145, bottom: 155 },
      approachClubs: { elite: "9i / 8i", mid: "8i / 7i", bottom: "7i" },
      strategy:
        "Mid-length par 4. Mid-iron in to a holdable green; fair birdie chance for the accurate.",
    },
    {
      hole: 9,
      par: 4,
      yards: 500,
      approachYds: { elite: 190, mid: 205, bottom: 215 },
      approachClubs: { elite: "5i", mid: "5i / hybrid", bottom: "hybrid / 5w" },
      strategy:
        "Long par 4 to close the front. Hybrid territory for the short — a 4 here is winning.",
      flag: "penalty",
      keyInsight: "Third 497+ par 4 of the front — distance gap shows.",
    },
    {
      hole: 10,
      par: 4,
      yards: 416,
      approachYds: { elite: 106, mid: 121, bottom: 131 },
      approachClubs: { elite: "PW / 9i", mid: "9i", bottom: "9i / 8i" },
      strategy:
        "Mid-length par 4 to open the back. Short iron in — a real scoring chance after the front's grind.",
      flag: "opportunity",
    },
    {
      hole: 11,
      par: 3,
      yards: 225,
      approachYds: { elite: 225, mid: 225, bottom: 225 },
      approachClubs: { elite: "5i / 4i", mid: "4i / hybrid", bottom: "hybrid" },
      strategy:
        "Long 225-yard par 3 — same hard shot for all. Bogey-or-worse is in play; par is gaining strokes.",
      flag: "penalty",
      keyInsight: "Second 220+ par 3 — bogey props lean over.",
    },
    {
      hole: 12,
      par: 4,
      yards: 375,
      approachYds: { elite: 65, mid: 80, bottom: 90 },
      approachClubs: { elite: "SW", mid: "SW / PW", bottom: "PW" },
      strategy:
        "Short par 4 — wedge in for the field after position off the tee. Convert.",
      flag: "opportunity",
    },
    {
      hole: 13,
      par: 4,
      yards: 526,
      approachYds: { elite: 216, mid: 231, bottom: 241 },
      approachClubs: { elite: "hybrid / 5w", mid: "5w / 3w", bottom: "3w" },
      strategy:
        "Monster 526-yard par 4 — fairway wood / hybrid in for everyone. Plays like a short par 5 with a par-4 result; bogey-or-worse common.",
      flag: "penalty",
      keyInsight: "Hardest hole on the course — fairway-wood approach for all.",
    },
    {
      hole: 14,
      par: 3,
      yards: 144,
      approachYds: { elite: 144, mid: 144, bottom: 144 },
      approachClubs: { elite: "PW / 9i", mid: "PW / 9i", bottom: "PW / 9i" },
      strategy:
        "Shortest par 3 on the course — wedge in for all. Birdie expected, bogey is a blown opportunity.",
      flag: "opportunity",
      keyInsight: "Birdie-or-bust par 3 — bounce-back hole after 13.",
    },
    {
      hole: 15,
      par: 4,
      yards: 434,
      approachYds: { elite: 124, mid: 139, bottom: 149 },
      approachClubs: { elite: "9i / 8i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Mid-length par 4 — short iron in for the accurate. Fair hole; convert the look.",
    },
    {
      hole: 16,
      par: 4,
      yards: 513,
      approachYds: { elite: 203, mid: 218, bottom: 228 },
      approachClubs: { elite: "5i / hybrid", mid: "hybrid / 5w", bottom: "5w / 3w" },
      strategy:
        "Another 510+ par 4 — long iron / hybrid in. Par is a strong score; the closing stretch grinds shorter hitters.",
      flag: "penalty",
    },
    {
      hole: 17,
      par: 4,
      yards: 530,
      approachYds: { elite: 220, mid: 235, bottom: 245 },
      approachClubs: { elite: "hybrid / 5w", mid: "5w / 3w", bottom: "3w" },
      strategy:
        "Brutal 530-yard par 4 — fairway-wood in for nearly everyone. A par 4 in name only; expect a slew of 5s on Sunday.",
      flag: "penalty",
      keyInsight: "Toughest finishing par 4 on Tour this week — 530 yds; bogey baseline.",
    },
    {
      hole: 18,
      par: 5,
      yards: 581,
      approachYds: { elite: 271, mid: 286, bottom: 296 },
      approachClubs: { elite: "3w (go) / layup", mid: "3w / layup", bottom: "layup" },
      strategy:
        "Long par-5 finisher — reachable for the bombers off a perfect drive, 3-shotter for the rest. Birdie expected for the leaders; eagle changes a Sunday.",
      flag: "opportunity",
      keyInsight: "Finisher with eagle in play — Sunday charges + protect-the-lead leans here.",
    },
  ],
  penaltyHoles: [5, 7, 9, 11, 13, 16, 17],
  opportunityHoles: [1, 4, 6, 10, 12, 14, 18],
  bettingAngles: [
    {
      title: "Back bombers who can hit a 5-iron",
      tone: "fit",
      body: "The setup explicitly rewards distance — twelve par 4s including three at 497+, two par 5s both gettable for the long. But three of those long par 4s (5, 9, 17) leave a 5-iron / hybrid even for elite drivers, so length alone isn't enough; you need ball-striking through the bag. Skip pure bombers without long-iron control.",
    },
    {
      title: "Fade shorter hitters even with great short games",
      tone: "fade",
      body: "Scramblers without distance bleed strokes on the long par 4s. Five holes (5, 9, 13, 16, 17) leave hybrid/5-wood approaches for sub-295 drivers — repeated bogey-or-worse exposure that no putter saves. Be selective with short-hitter outrights even when their form is hot.",
    },
    {
      title: "Hole 13 + 17 bogey-or-worse props lean over",
      tone: "prop",
      body: "Two 525+ par 4s where even elite drivers face fairway-wood approaches. Bogey-or-worse counts on those holes specifically run well above the field's per-hole average. Pair with bogey-or-worse on the long par 3s (7, 11) for the same reason.",
    },
    {
      title: "Par-3 birdies-or-better split: lean over on 4 + 14, under on 7 + 11",
      tone: "prop",
      body: "The four par 3s bifurcate hard: 4 (158y) and 14 (144y) are wedge birdie chances; 7 (237y) and 11 (225y) are long-iron par holes. Par-3 birdie props on the short ones over-perform, on the long ones under-perform — both edges relative to a flat per-hole base rate.",
    },
    {
      title: "Course history matters here",
      tone: "general",
      body: "Short tournament history (since 2023 at Osprey Valley) means small sample, but the pattern from 2023-2024 is clear: ball-strikers who can also handle long irons. Nick Taylor and Robert MacIntyre are both proof of concept; weight Canadian Open form heavily but watch sample size.",
    },
    {
      title: "Weather and rough can swing it",
      tone: "general",
      body: "Cool-climate Canadian June — overnight rain softens the course, soft conditions help the long iron tier; firm windy conditions swing the edge back to elite drivers who hold the firm greens. Check Thursday/Friday forecast before locking outright cards.",
    },
  ],
  verdict:
    "Osprey Valley's Heathlands is a brutal par 70 in disguise — twelve par 4s including three at 497+, plus two 225+ par 3s, mean shorter hitters are repeatedly punished. Build outright cards around bombers with elite long-iron play; fade pure scramblers without distance. Winning score lands −14 to −18 unless the wind blows hard, with the back-nine 13/16/17 stretch deciding it.",
};
