import type { CourseGuide } from "./types";

// 2026 U.S. Open — Shinnecock Hills Golf Club.
// William Flynn 1931 redesign of the original 1891 W.H. Davis layout.
// Hosted the U.S. Open in 1896, 1995, 2004, 2018 and now 2026 — winning
// scores at the modern era have been +1 (Koepka '18), -4 (Goosen '04),
// E (Pavin '95), -1 (Floyd '86): even par is genuinely the line.
//
// Per-hole pars + yardages verified against operator-supplied PGA Tour
// course-stats data: out 3,819 / 35, in 3,621 / 35, total 7,440 / 70.
// Distinctive setup — twelve par 4s (six over 470), only two par 5s,
// and four par 3s that include a 252-yard monster at #2.
//
// Publishes Sunday evening before U.S. Open week, ~4 days before
// Thursday tee-off.

export const SHINNECOCK_HILLS: CourseGuide = {
  slug: "shinnecock-hills",
  publishedAt: "2026-06-14T22:00:00Z",
  tournamentStartsAt: "2026-06-18T13:00:00Z",
  tournament: "U.S. Open",
  dates: "June 18–21, 2026",
  courseName: "Shinnecock Hills Golf Club",
  location: "Southampton, NY",
  designer: "William Flynn (1931 redesign)",
  established: 1891,
  par: 70,
  yards: 7440,
  courseRating: 77.5,
  slope: 150,
  greens: "Fescue / Bentgrass",
  fairways: "Fescue (firm, fast)",
  difficultyRank: "Classic U.S. Open par 70 — among the toughest setups on Tour",
  waterOnHoles: 0,
  headline: "Even par is the line — Flynn's masterpiece in full U.S. Open dress.",
  tldr:
    "Shinnecock is the closest a links-style design gets on U.S. soil: rolling fescue corridors, exposed wind, firm fast greens, and a setup the USGA pushes to the limit. Winning scores at recent U.S. Opens here run +1 to −4 (Koepka +1 in 2018, Goosen −4 in 2004); par is genuinely competitive. Twelve par 4s including six over 470 yards plus a 252-yard par 3 (hole 2) mean distance is mandatory — but the fescue rough punishes the wild driver as much as the long irons reward the precise one. Build outright cards around proven major-bracket ball-strikers; fade pure scramblers and pure bombers who spray.",
  skillStack: [
    "Strokes Gained: Approach (firm greens demand control)",
    "Driving accuracy (fescue rough = stroke-loss territory)",
    "Long iron / hybrid play (six par 4s over 470, 252-yd par 3)",
    "Putting (firm bentgrass / fescue, can run 13+ on Stimp)",
    "Around-the-green scrambling (USGA setup forces misses)",
  ],
  tiers: [
    {
      id: "elite",
      label: "Elite drivers",
      range: "310+ yards",
      description:
        "Top-40 Tour drivers. Distance is a real asset on the long par 4s (3, 4, 6, 9, 12, 14, 18) and the only weapon that turns 614-yd hole 16 from a layup chore into a true par-5. But Shinnecock's fescue penalizes the missed line as much as any course on Tour — accuracy gates the distance edge.",
      examples: ["Rory McIlroy", "Bryson DeChambeau", "Ludvig Aberg", "Cameron Young"],
      expectedScore: "−4 to +3 (winning range E to −4)",
      avgApproachYds: 174,
      totalApproachYds: 3132,
      keyToSuccess:
        "Find fairways, attack the two par 5s for birdie, and survive the 14/18 closing stretch at par. The bombers who win majors here win because they hit fairways under pressure, not because they bomb past trouble.",
    },
    {
      id: "mid",
      label: "Mid-tier drivers",
      range: "295–310 yards",
      description:
        "Top 40–100 in driving distance. Roughly +180 approach yards a round vs elite — a real tax on a course where four par 4s already require mid-iron approaches. Mid-iron precision is the single most important separator at this tier; major winners in this group (Koepka 2018, Goosen 2004) won on iron play, not distance.",
      examples: ["Matt Fitzpatrick", "Tommy Fleetwood", "Russell Henley", "Tyrrell Hatton"],
      expectedScore: "E to +5 (legitimate winning tier — Koepka type)",
      avgApproachYds: 186,
      totalApproachYds: 3348,
      keyToSuccess:
        "Major-grade iron play and elite putting on firm greens. The mid-tier winners here aren't the longest — they're the ones who keep approaches inside 25 feet from 175-200 yards out, all four days.",
    },
    {
      id: "bottom",
      label: "Shorter drivers",
      range: "≤ 295 yards",
      description:
        "Outside top-100 in driving distance. Six 470+ par 4s plus a 252-yard par 3 means hybrid / long-iron approaches into firm greens for half the round. The margin for error in a U.S. Open setup is brutally thin at this tier — historically only the very best putting and short game keep these guys in contention.",
      examples: ["Russell Henley", "Brian Harman"],
      expectedScore: "+3 to +10 (top-25 ceiling, top-10 if everything clicks)",
      avgApproachYds: 198,
      totalApproachYds: 3564,
      keyToSuccess:
        "World-class scrambling + lights-out putting. Without both, the 4-7-14-16 stretch grinds the round down. Picks here are top-30 / matchups, not outrights.",
    },
  ],
  holes: [
    {
      hole: 1,
      par: 4,
      yards: 394,
      approachYds: { elite: 79, mid: 92, bottom: 104 },
      approachClubs: { elite: "SW", mid: "SW / PW", bottom: "PW" },
      strategy:
        "Short par-4 opener — downhill, wedge in. A friendly start, but bogey here is a giveaway. Convert the look or be honest about a U.S. Open par.",
      flag: "opportunity",
    },
    {
      hole: 2,
      par: 3,
      yards: 252,
      approachYds: { elite: 252, mid: 252, bottom: 252 },
      approachClubs: { elite: "3i / hybrid", mid: "hybrid", bottom: "hybrid / 5w" },
      strategy:
        "Monster 252-yard par 3 — driver for some shorter hitters, long iron / hybrid for the rest. The hardest tee shot on the course; bail short, take your par.",
      flag: "penalty",
      keyInsight: "Hardest par 3 on Tour this week — 252 yds; bogey baseline.",
    },
    {
      hole: 3,
      par: 4,
      yards: 501,
      approachYds: { elite: 186, mid: 199, bottom: 211 },
      approachClubs: { elite: "6i", mid: "5i", bottom: "4i / hybrid" },
      strategy:
        "Long par 4 — mid-to-long iron in for everyone. Fairway is essential to hold a firm green; missing here multiplies your par-saving work.",
      flag: "penalty",
    },
    {
      hole: 4,
      par: 4,
      yards: 476,
      approachYds: { elite: 161, mid: 174, bottom: 186 },
      approachClubs: { elite: "7i", mid: "6i", bottom: "5i" },
      strategy:
        "Another full-iron par 4. Position off the tee — the U.S. Open setup rewards accurate over long, every time on this hole.",
    },
    {
      hole: 5,
      par: 5,
      yards: 592,
      approachYds: { elite: 100, mid: 113, bottom: 125 },
      approachClubs: { elite: "PW", mid: "9i", bottom: "9i / 8i" },
      strategy:
        "Only par 5 on the front — 3-shotter for everyone after a layup, but a wedge in for the third. The field's clearest birdie chance through nine.",
      flag: "opportunity",
      keyInsight: "Front-9 scoring hole — make the 4.",
    },
    {
      hole: 6,
      par: 4,
      yards: 495,
      approachYds: { elite: 180, mid: 193, bottom: 205 },
      approachClubs: { elite: "6i", mid: "5i", bottom: "4i / hybrid" },
      strategy:
        "Demanding par 4 — long iron in, exposed to the wind off the bay. A par here is a strong score; the leaders escape this stretch at level par.",
      flag: "penalty",
    },
    {
      hole: 7,
      par: 3,
      yards: 187,
      approachYds: { elite: 187, mid: 187, bottom: 187 },
      approachClubs: { elite: "7i", mid: "7i", bottom: "7i" },
      strategy:
        "The famous Redan — short par 3 with the original Redan green, kicker slope feeds the right pin from a left-edge land spot. Aim for the slope, let it work.",
      keyInsight: "Iconic Redan green — proper line beats raw distance control.",
    },
    {
      hole: 8,
      par: 4,
      yards: 440,
      approachYds: { elite: 125, mid: 138, bottom: 150 },
      approachClubs: { elite: "9i", mid: "8i", bottom: "8i / 7i" },
      strategy:
        "Mid-length par 4 — short-to-mid iron in. Fair hole; a 4 here is keeping pace.",
    },
    {
      hole: 9,
      par: 4,
      yards: 482,
      approachYds: { elite: 167, mid: 180, bottom: 192 },
      approachClubs: { elite: "6i", mid: "6i / 5i", bottom: "5i" },
      strategy:
        "Uphill long par 4 to close the front. Mid-long iron in — par is gaining ground after the front-nine grind.",
      flag: "penalty",
    },
    {
      hole: 10,
      par: 4,
      yards: 415,
      approachYds: { elite: 100, mid: 113, bottom: 125 },
      approachClubs: { elite: "PW", mid: "9i", bottom: "9i / 8i" },
      strategy:
        "Short-iron par 4 — wedge / short iron in for the field. A real birdie chance to start the back.",
      flag: "opportunity",
    },
    {
      hole: 11,
      par: 3,
      yards: 157,
      approachYds: { elite: 157, mid: 157, bottom: 157 },
      approachClubs: { elite: "PW", mid: "PW", bottom: "PW" },
      strategy:
        "Short par 3 — wedge in for all. The field's best chance to convert a birdie on a par 3 all week.",
      flag: "opportunity",
      keyInsight: "Shortest par 3 — birdie expected; bogey is a stroke leak.",
    },
    {
      hole: 12,
      par: 4,
      yards: 469,
      approachYds: { elite: 154, mid: 167, bottom: 179 },
      approachClubs: { elite: "7i", mid: "6i", bottom: "6i / 5i" },
      strategy:
        "Mid-long par 4 — mid-iron in. Defensive hole; control the tee shot and accept the par.",
    },
    {
      hole: 13,
      par: 4,
      yards: 371,
      approachYds: { elite: 56, mid: 69, bottom: 81 },
      approachClubs: { elite: "SW", mid: "SW", bottom: "SW / PW" },
      strategy:
        "Short par 4 — drivable for elite drivers off a perfect line, wedge for everyone else. The day's clearest aggressive look at birdie before the closing stretch begins.",
      flag: "opportunity",
      keyInsight: "Drivable par 4 — eagle in play, birdie expected.",
    },
    {
      hole: 14,
      par: 4,
      yards: 520,
      approachYds: { elite: 205, mid: 218, bottom: 230 },
      approachClubs: { elite: "4i / hybrid", mid: "hybrid", bottom: "hybrid / 5w" },
      strategy:
        "Monster 520-yard par 4 — fairway wood / hybrid in for nearly everyone. Plays like a short par 5 with a par-4 result; bogey is the field average.",
      flag: "penalty",
      keyInsight: "Bogey baseline — par gains 0.4+ strokes.",
    },
    {
      hole: 15,
      par: 4,
      yards: 409,
      approachYds: { elite: 94, mid: 107, bottom: 119 },
      approachClubs: { elite: "SW / PW", mid: "9i", bottom: "9i / 8i" },
      strategy:
        "Short-iron par 4 — wedge / short iron in for everyone. Bounce-back hole after 14; the leaders convert here.",
      flag: "opportunity",
    },
    {
      hole: 16,
      par: 5,
      yards: 614,
      approachYds: { elite: 130, mid: 145, bottom: 155 },
      approachClubs: { elite: "9i / 8i", mid: "8i / 7i", bottom: "7i" },
      strategy:
        "Huge 614-yard par 5 — three-shotter for nearly everyone, true reach-in-two only for the absolute bombers. Either way the field gets a short-iron birdie look on the third. Make the 4.",
      flag: "opportunity",
      keyInsight: "Only par 5 on the back — Sunday lead-changes get made here.",
    },
    {
      hole: 17,
      par: 3,
      yards: 176,
      approachYds: { elite: 176, mid: 176, bottom: 176 },
      approachClubs: { elite: "7i / 6i", mid: "7i / 6i", bottom: "7i / 6i" },
      strategy:
        "Mid par 3 — same shot for all. Wind direction off the bay decides whether 7-iron or 6 is the call. Center pin, take the par, walk to 18.",
    },
    {
      hole: 18,
      par: 4,
      yards: 490,
      approachYds: { elite: 175, mid: 188, bottom: 200 },
      approachClubs: { elite: "6i", mid: "6i / 5i", bottom: "5i / hybrid" },
      strategy:
        "Historic Shinnecock finisher — blind tee shot up a chute, then mid-long iron uphill to a green tucked against the clubhouse. Champions hit this fairway. Par closes a U.S. Open.",
      flag: "penalty",
      keyInsight: "Sunday drama hole — bogey decides tournaments.",
    },
  ],
  penaltyHoles: [2, 3, 6, 9, 14, 18],
  opportunityHoles: [1, 5, 10, 11, 13, 15, 16],
  bettingAngles: [
    {
      title: "Back proven major-grade ball-strikers",
      tone: "fit",
      body: "U.S. Open Shinnecock setups historically reward elite ball-striking above any single other skill — Koepka (2018), Goosen (2004), Pavin (1995) all won with major-tier iron play, not distance heroics. Weight Strokes Gained: Approach + recent major form heavily. Skip players whose game depends on red numbers and momentum.",
    },
    {
      title: "Distance helps, but accuracy gates the edge",
      tone: "fit",
      body: "Six par 4s over 470 yards means distance is a real asset — but Shinnecock's fescue rough turns spray drivers into bogey machines. The fit is bombers who find fairways (Aberg, Young, Schauffele types); the fade is bombers who don't (some past US Open champs included).",
    },
    {
      title: "Fade pure short-game scramblers without distance",
      tone: "fade",
      body: "Shorter drivers face hybrid / long-iron approaches on at least six holes. No amount of scrambling closes that gap over four rounds against the major-grade field. Be selective even with hot short-hitter form.",
    },
    {
      title: "Hole 2 + 14 bogey-or-worse props lean over",
      tone: "prop",
      body: "252-yard par 3 and 520-yard par 4 are the two holes where even elite drivers are facing long irons / fairway-woods into firm greens. Bogey-or-worse rates on those holes run well above field average — clean angle on per-hole props.",
    },
    {
      title: "Par-3 birdie split — under on 2, over on 11",
      tone: "prop",
      body: "Mirror of the hole-length split: 2 (252y) is bogey baseline, 11 (157y) is a real birdie chance. Per-hole birdie props on the short par 3 are well-priced overs vs base rate; the long ones are dead unders.",
    },
    {
      title: "Watch the forecast — wind decides scoring",
      tone: "general",
      body: "Shinnecock sits exposed to the Atlantic / Peconic Bay; wind shifts the winning score dramatically (Koepka +1 in heavy '18 winds; Goosen -4 in soft '04). Hold outright cards until Wednesday morning when the four-day forecast firms up; lean toward elite ball-strikers in any wind > 12 mph forecast.",
    },
  ],
  verdict:
    "Shinnecock in full U.S. Open dress is the toughest setup on Tour this year — par is the line, not a milestone. Build outright cards around elite ball-strikers with major-grade approach play and accurate driving; fade pure bombers who spray and pure scramblers without distance. The 2/14/18 stretch decides who's still standing Sunday afternoon. Expect a winning score between even and -4.",
};
