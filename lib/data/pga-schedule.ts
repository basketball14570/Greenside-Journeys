// PGA Tour 2026 season schedule.
//
// Source: pgatour.com/schedule (manually curated; dates / courses are
// publicly listed). We intentionally don't scrape because the structure
// changes and outbound traffic from the runtime to pgatour.com isn't
// allowed under the standard network policy.
//
// What this is used for:
//   - The dashboard EventStrap reads `getActiveEvent()` to pick which
//     tournament to display when ESPN's snapshot is unavailable
//     (e.g. between events or during sandbox testing).
//   - /dashboard/schedule renders the full season with past / live /
//     upcoming status.
//   - Ownership module joins on tournament name to badge events that
//     already have data attached.
//
// To refresh for a new season: replace SCHEDULE, bump SEASON_YEAR.

import { goLiveAtCentral } from "@/lib/data/event-rollover";

export type PgaEvent = {
  id: string;                  // kebab-case: "2026-truist-championship"
  name: string;                // display name: "Truist Championship"
  course: string;              // primary course name
  city: string;                // "Charlotte, NC"
  startDate: string;           // ISO date — first round
  endDate: string;             // ISO date — final round
  tour: "PGA" | "Korn Ferry" | "Champions" | "DPWT";
  type: "signature" | "full_cut" | "sig_cut" | "major" | "limited" | "alternate";
  purseMillions?: number;
  fedExPoints?: number;
};

export const SEASON_YEAR = 2026;

// Reverse-chronological isn't useful for a schedule; this is in date order.
export const SCHEDULE: PgaEvent[] = [
  { id: "2026-sentry", name: "The Sentry", course: "Kapalua Plantation", city: "Kapalua, HI", startDate: "2026-01-01", endDate: "2026-01-04", tour: "PGA", type: "signature" },
  { id: "2026-sony", name: "Sony Open in Hawaii", course: "Waialae Country Club", city: "Honolulu, HI", startDate: "2026-01-08", endDate: "2026-01-11", tour: "PGA", type: "full_cut" },
  { id: "2026-american-express", name: "The American Express", course: "PGA West (Pete Dye Stadium)", city: "La Quinta, CA", startDate: "2026-01-15", endDate: "2026-01-18", tour: "PGA", type: "full_cut" },
  { id: "2026-farmers", name: "Farmers Insurance Open", course: "Torrey Pines (South)", city: "San Diego, CA", startDate: "2026-01-21", endDate: "2026-01-24", tour: "PGA", type: "full_cut" },
  { id: "2026-att-pebble", name: "AT&T Pebble Beach Pro-Am", course: "Pebble Beach Golf Links", city: "Pebble Beach, CA", startDate: "2026-01-29", endDate: "2026-02-01", tour: "PGA", type: "signature" },
  { id: "2026-wm-phoenix", name: "WM Phoenix Open", course: "TPC Scottsdale (Stadium)", city: "Scottsdale, AZ", startDate: "2026-02-05", endDate: "2026-02-08", tour: "PGA", type: "full_cut" },
  { id: "2026-genesis", name: "Genesis Invitational", course: "Riviera Country Club", city: "Pacific Palisades, CA", startDate: "2026-02-12", endDate: "2026-02-15", tour: "PGA", type: "sig_cut" },
  { id: "2026-mexico", name: "Mexico Open at VidantaWorld", course: "VidantaWorld (Vallarta)", city: "Vallarta, MX", startDate: "2026-02-19", endDate: "2026-02-22", tour: "PGA", type: "full_cut" },
  { id: "2026-cognizant", name: "Cognizant Classic in The Palm Beaches", course: "PGA National (Champion)", city: "Palm Beach Gardens, FL", startDate: "2026-02-26", endDate: "2026-03-01", tour: "PGA", type: "full_cut" },
  { id: "2026-api", name: "Arnold Palmer Invitational", course: "Bay Hill Club & Lodge", city: "Orlando, FL", startDate: "2026-03-05", endDate: "2026-03-08", tour: "PGA", type: "sig_cut" },
  { id: "2026-players", name: "THE PLAYERS Championship", course: "TPC Sawgrass (Stadium)", city: "Ponte Vedra Beach, FL", startDate: "2026-03-12", endDate: "2026-03-15", tour: "PGA", type: "full_cut" },
  { id: "2026-valspar", name: "Valspar Championship", course: "Innisbrook (Copperhead)", city: "Palm Harbor, FL", startDate: "2026-03-19", endDate: "2026-03-22", tour: "PGA", type: "full_cut" },
  { id: "2026-houston", name: "Texas Children's Houston Open", course: "Memorial Park Golf Course", city: "Houston, TX", startDate: "2026-03-26", endDate: "2026-03-29", tour: "PGA", type: "full_cut" },
  { id: "2026-valero", name: "Valero Texas Open", course: "TPC San Antonio (Oaks)", city: "San Antonio, TX", startDate: "2026-04-02", endDate: "2026-04-05", tour: "PGA", type: "full_cut" },
  { id: "2026-masters", name: "Masters Tournament", course: "Augusta National", city: "Augusta, GA", startDate: "2026-04-09", endDate: "2026-04-12", tour: "PGA", type: "major" },
  { id: "2026-harbour-town", name: "RBC Heritage", course: "Harbour Town Golf Links", city: "Hilton Head Island, SC", startDate: "2026-04-16", endDate: "2026-04-19", tour: "PGA", type: "signature" },
  { id: "2026-corales", name: "Corales Puntacana Championship", course: "Puntacana Resort (Corales)", city: "Punta Cana, DR", startDate: "2026-04-23", endDate: "2026-04-26", tour: "PGA", type: "alternate" },
  { id: "2026-zurich", name: "Zurich Classic of New Orleans", course: "TPC Louisiana", city: "Avondale, LA", startDate: "2026-04-23", endDate: "2026-04-26", tour: "PGA", type: "full_cut" },
  { id: "2026-myrtle-beach", name: "Myrtle Beach Classic", course: "Dunes Golf & Beach Club", city: "Myrtle Beach, SC", startDate: "2026-05-07", endDate: "2026-05-10", tour: "PGA", type: "alternate" },
  { id: "2026-truist", name: "Truist Championship", course: "Quail Hollow Club", city: "Charlotte, NC", startDate: "2026-05-07", endDate: "2026-05-10", tour: "PGA", type: "signature" },
  { id: "2026-pga", name: "PGA Championship", course: "Aronimink Golf Club", city: "Newtown Square, PA", startDate: "2026-05-14", endDate: "2026-05-17", tour: "PGA", type: "major" },
  { id: "2026-cj-cup-byron", name: "CJ Cup Byron Nelson", course: "TPC Craig Ranch", city: "McKinney, TX", startDate: "2026-05-21", endDate: "2026-05-24", tour: "PGA", type: "full_cut" },
  { id: "2026-charles-schwab", name: "Charles Schwab Challenge", course: "Colonial Country Club", city: "Fort Worth, TX", startDate: "2026-05-28", endDate: "2026-05-31", tour: "PGA", type: "full_cut" },
  { id: "2026-memorial", name: "the Memorial Tournament", course: "Muirfield Village", city: "Dublin, OH", startDate: "2026-06-04", endDate: "2026-06-07", tour: "PGA", type: "signature" },
  { id: "2026-rbc-canadian", name: "RBC Canadian Open", course: "TPC Toronto at Osprey Valley", city: "Caledon, ON", startDate: "2026-06-11", endDate: "2026-06-14", tour: "PGA", type: "full_cut" },
  { id: "2026-us-open", name: "U.S. Open", course: "Shinnecock Hills", city: "Southampton, NY", startDate: "2026-06-18", endDate: "2026-06-21", tour: "PGA", type: "major" },
  { id: "2026-travelers", name: "Travelers Championship", course: "TPC River Highlands", city: "Cromwell, CT", startDate: "2026-06-25", endDate: "2026-06-28", tour: "PGA", type: "signature" },
  { id: "2026-rocket", name: "Rocket Classic", course: "Detroit Golf Club", city: "Detroit, MI", startDate: "2026-07-02", endDate: "2026-07-05", tour: "PGA", type: "full_cut" },
  { id: "2026-john-deere", name: "John Deere Classic", course: "TPC Deere Run", city: "Silvis, IL", startDate: "2026-07-09", endDate: "2026-07-12", tour: "PGA", type: "full_cut" },
  { id: "2026-scottish-open", name: "Genesis Scottish Open", course: "The Renaissance Club", city: "North Berwick, Scotland", startDate: "2026-07-09", endDate: "2026-07-12", tour: "PGA", type: "full_cut" },
  { id: "2026-isco", name: "ISCO Championship", course: "Hurstbourne Country Club", city: "Louisville, KY", startDate: "2026-07-16", endDate: "2026-07-19", tour: "PGA", type: "alternate" },
  { id: "2026-open", name: "The Open Championship", course: "Royal Birkdale", city: "Southport, England", startDate: "2026-07-16", endDate: "2026-07-19", tour: "PGA", type: "major" },
  { id: "2026-3m", name: "3M Open", course: "TPC Twin Cities", city: "Blaine, MN", startDate: "2026-07-23", endDate: "2026-07-26", tour: "PGA", type: "full_cut" },
  { id: "2026-wyndham", name: "Wyndham Championship", course: "Sedgefield Country Club", city: "Greensboro, NC", startDate: "2026-07-30", endDate: "2026-08-02", tour: "PGA", type: "full_cut" },
  { id: "2026-st-jude", name: "FedEx St. Jude Championship", course: "TPC Southwind", city: "Memphis, TN", startDate: "2026-08-06", endDate: "2026-08-09", tour: "PGA", type: "signature" },
  { id: "2026-bmw", name: "BMW Championship", course: "Caves Valley", city: "Owings Mills, MD", startDate: "2026-08-13", endDate: "2026-08-16", tour: "PGA", type: "signature" },
  { id: "2026-tour-championship", name: "TOUR Championship", course: "East Lake Golf Club", city: "Atlanta, GA", startDate: "2026-08-20", endDate: "2026-08-23", tour: "PGA", type: "signature" },
  { id: "2026-procore", name: "Procore Championship", course: "Silverado Resort (North)", city: "Napa, CA", startDate: "2026-09-10", endDate: "2026-09-13", tour: "PGA", type: "full_cut" },
  { id: "2026-presidents-cup", name: "Presidents Cup", course: "Medinah Country Club", city: "Medinah, IL", startDate: "2026-09-24", endDate: "2026-09-27", tour: "PGA", type: "limited" },
  { id: "2026-sanderson", name: "Sanderson Farms Championship", course: "The Country Club of Jackson", city: "Jackson, MS", startDate: "2026-10-01", endDate: "2026-10-04", tour: "PGA", type: "full_cut" },
  { id: "2026-shriners", name: "Shriners Children's Open", course: "TPC Summerlin", city: "Las Vegas, NV", startDate: "2026-10-08", endDate: "2026-10-11", tour: "PGA", type: "full_cut" },
  { id: "2026-zozo", name: "ZOZO Championship", course: "Accordia Golf Narashino CC", city: "Inzai, Japan", startDate: "2026-10-15", endDate: "2026-10-18", tour: "PGA", type: "limited" },
  { id: "2026-bank-utah", name: "Black Desert Championship", course: "Black Desert Resort", city: "Ivins, UT", startDate: "2026-10-22", endDate: "2026-10-25", tour: "PGA", type: "full_cut" },
  { id: "2026-world-wide", name: "World Wide Technology Championship", course: "El Cardonal at Diamante", city: "Cabo San Lucas, MX", startDate: "2026-10-29", endDate: "2026-11-01", tour: "PGA", type: "alternate" },
  { id: "2026-bermuda", name: "Butterfield Bermuda Championship", course: "Port Royal Golf Course", city: "Southampton, Bermuda", startDate: "2026-11-05", endDate: "2026-11-08", tour: "PGA", type: "alternate" },
  { id: "2026-rsm", name: "The RSM Classic", course: "Sea Island Golf Club", city: "St. Simons Island, GA", startDate: "2026-11-19", endDate: "2026-11-22", tour: "PGA", type: "full_cut" },
  { id: "2026-hero", name: "Hero World Challenge", course: "Albany", city: "New Providence, Bahamas", startDate: "2026-12-03", endDate: "2026-12-06", tour: "PGA", type: "limited" },
];

// ── Helpers ─────────────────────────────────────────────

export type EventStatus = "past" | "live" | "upcoming";

export function statusOf(event: PgaEvent, now = new Date()): EventStatus {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  // Include the final day; tournaments wrap by Sunday 8-9pm ET. We give
  // the date a one-day grace so a Sunday-night visitor still sees "live".
  end.setUTCHours(23, 59, 59, 999);
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "live";
}

// The "active" event rolls over at 8pm Central on the Sunday before each
// tournament week — the same instant the course guide flips — so the header,
// weather, conditions and guide stay in lockstep. It's the event with the
// most recent go-live that has passed; on shared-week pairs the first-listed
// (primary) event wins the tie. Falls back to the next upcoming event before
// the season's first go-live, then to the last event at season's end.
export function getActiveEvent(now = new Date()): PgaEvent | null {
  const t = now.getTime();
  let current: PgaEvent | null = null;
  let currentGo = -Infinity;
  for (const e of SCHEDULE) {
    const go = goLiveAtCentral(e.startDate);
    if (go <= t && go > currentGo) {
      current = e;
      currentGo = go;
    }
  }
  if (current) return current;
  const upcoming = SCHEDULE.find((e) => goLiveAtCentral(e.startDate) > t);
  return upcoming ?? SCHEDULE[SCHEDULE.length - 1] ?? null;
}

export function findEventByName(name: string): PgaEvent | null {
  const normalized = norm(name);
  for (const e of SCHEDULE) {
    if (norm(e.name) === normalized) return e;
    // ESPN sometimes returns short names; substring match as a fallback.
    if (normalized.includes(norm(e.name)) || norm(e.name).includes(normalized)) return e;
  }
  return null;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
