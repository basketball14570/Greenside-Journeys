# Sports Dashboard

_Started 2026-05-15 23:17 UTC_

---

## User

I would want to create a dashboard that includes current bets across various sportsbooks. Also a weather forecast based on where the tournament is located. Please use the text conversation to see the overview.

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- scope: Explore a few options
- platform: Both - mobile primary, desktop secondary
- aesthetic: 0
- tournament_context: Fictional 'Quail Hollow Championship' as referenced in the conversation
- weather_emphasis: Top hero — wind + wave split is the headline of the page
- bet_detail: Stake + potential payout, Live status (graded / live / pending), Sportsbook source (DK / FD / PP / UD), Player + market + line
- alerts: Yes — dedicated panel with live wind/wave/hedge alerts
- leaderboard: Yes — full leaderboard widget showing my exposed players highlighted
- variations: Decide for me
- vibe: Mix — sharp numbers, friendly alerts

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

Locked in: **dark fairway green** aesthetic — deep forest backgrounds (`#0a1f14`), warm off-white text, bright fairway-green for live/positive states, amber for wind warnings, red for negative EV. Typography pairs **Instrument Serif** (display italics for big stats) with **Instrument Sans** (UI) and **JetBrains Mono** (numerics). Brand name: **Greenside**.

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: write_file]_

Now let me write the shared theme primitives and the three screens.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Built a 3-artboard exploration on a pan/zoom canvas:

**Mobile · Primary** (iPhone, 402w)
- **Today** — top-hero weather card (18 mph + WSW arrow, hourly gust sparkline, AM/PM wave-split bar), live alerts feed (wave-shift / wind / hedge), open tickets across DK · FD · PP · UD with live status + EV%, exposed-player leaderboard
- **Alert detail** — what you see tapping the wave-shift alert: AM vs PM exposure breakdown, per-ticket EV move with strikethrough odds, wind-sensitivity rankings for your players

**Desktop · Secondary** (1440w, in browser chrome)
- App bar + event strap, three-column weather hero (narrative / hourly chart / wave split + exposure), full bets table with filter chips, right rail with alerts + 12-deep leaderboard

**System**: dark fairway green (`#0a1f14`), Instrument Serif italics for big stats, JetBrains Mono for numerics + labels, Instrument Sans for UI. Sportsbook references are original 2-letter chips (DK/FD/PP/UD) — no recreated branding.

**Caveats**: data is synthetic; book chips are abstract; the Greenside name is a working placeholder. Drag artboards to reorder, click any one to focus full-screen.

**Next moves** if you want them: DFS optimizer screen, settled-bet history with P&L charts, push-notification mock, or a light-theme variation.

## User

Save this design as a PDF: index.html

