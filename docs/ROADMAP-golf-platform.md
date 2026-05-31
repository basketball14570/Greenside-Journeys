# Greenside Edge → All-in-one golf platform (roadmap)

Greenside Edge started as a betting/DFS intelligence layer for golf. The
strategic bet captured here: keep the betting features as the core
differentiator and expand into the everyday golfer's workflow — GPS
rangefinder while playing, and tee-time booking — to grow from a
bettors' tool into a go-to golf app.

This doc records the **budget-first** architecture so the direction
survives across sessions.

## Pillars

1. **Bet intelligence** (existing) — dashboard, slip parsing, grading,
   leaderboard. Unchanged; remains the moat no other golf app has.
2. **Play / GPS rangefinder** (new) — live yardages to the green while
   on the course.
3. **Tee times** (new) — find and book rounds.

## Budget decisions

### GPS course data — free path first

Full findings live in the research the founder ran; the short version:

- Rangefinder-grade data (green front/center/back coordinates) is sold
  by GolfLogix, iGolf/SkyCaddie, Maps4Golf, etc. — all "contact sales,"
  roughly **$5k–$15k/yr** to start, more for broad coverage. Garmin's
  41k-course set is proprietary and not licensable.
- Free alternatives: **OpenStreetMap** (ODbL, commercial OK with
  attribution) and **OpenGolfAPI** (17k+ US courses, GeoJSON/CSV, no key).
  Coverage of green-level coordinates is uneven and must be verified.
- Crowdsourcing works: Golf Pad's "Scout" maps a course in ~10-15 min;
  satellite tracing ~25-30 min. This is how the incumbents bootstrapped.

**Chosen approach (implemented in v1):**

- The app computes yardages **client-side** from device GPS
  (`expo-location`) + stored green coordinates. No server, no key, no
  per-request cost. See `apps/mobile/lib/geo.ts` (haversine) and
  `apps/mobile/lib/useLocation.ts`.
- The course-data source is **pluggable** behind `lib/courses.ts`:
  - Default (unset `extra.courseApiUrl`): a **bundled sample course** so
    the feature is fully functional with zero data spend (demos,
    TestFlight).
  - Set `extra.courseApiUrl` to a free provider (OpenGolfAPI / an
    OSM-derived endpoint) for real coverage, or a licensed endpoint
    later. The screen code never changes — only the data source.
- The `Course.source` field (`sample` | `open` | `licensed`) lets the UI
  stay honest about precision.

**Next steps when there's budget/time:**

1. Stand up a thin proxy route on the web app (`/api/courses/...`) so a
   future paid API key never ships in the binary, and so OSM/OpenGolfAPI
   responses can be normalized + cached server-side.
2. Build a Scout-style crowdsource mapping tool (web) to grow our own
   ODbL-clean dataset — turns data from a recurring cost into an asset.
3. License the top ~200-500 marquee courses for launch-market polish.

### Tee times — affiliate path first

- Building course inventory is a sales/ops business, not a sprint.
  Aggregators (GolfNow, etc.) have affiliate/partner programs.

**Chosen approach (implemented in v1):**

- `apps/mobile/app/(tabs)/tee-times.tsx` surfaces an aggregator booking
  site in a webview. Zero integration cost, earns referral revenue,
  validates demand. The URL is configurable via `extra.teeTimesUrl` —
  put an **affiliate/partner link** there so referrals are attributed.

**Next steps:**

1. Apply to GolfNow / aggregator affiliate programs; swap in the
   attributed link.
2. If demand is real, integrate a booking API for a native search/book
   flow (date, time, players, price) instead of the webview.
3. Long-term: direct course-inventory deals (highest margin, highest
   effort).

## App information architecture

Five bottom tabs:

| Tab | Type | Source |
|-----|------|--------|
| Home (Dashboard) | webview | greensideedge.com/dashboard |
| Bets | webview | greensideedge.com/dashboard/bets |
| Play | **native** | GPS rangefinder (this roadmap) |
| Tee Times | webview | aggregator/affiliate |
| Settings | native | account |

Leaderboard is reachable via the dashboard webview's own nav (kept as a
hidden route to keep the bar to five items). Bet-slip Scan is a header
shortcut on the betting tabs.

## Status

- [x] Phase 1 app scaffold (auth, tabs, webview betting screens, scan, push)
- [x] GPS rangefinder v1 (device GPS + pluggable course data + sample course)
- [x] Tee times v1 (aggregator webview, configurable affiliate URL)
- [ ] Course-data proxy + caching route
- [ ] Crowdsource mapping tool
- [ ] Native tee-time booking flow
- [ ] Widgets / Live Activity (lock-screen in-play bets + live yardage)
