// Netlify Function: server-side proxy for PGA Tour leaderboard stats.
//
// Fetches pgatour.com's public leaderboard, extracts the Next.js __NEXT_DATA__
// blob, and returns a normalized {players:[...]} payload with per-round
// fairways hit and greens in regulation when present.
//
// Why server-side: pgatour.com's APIs do not send CORS headers for third-party
// origins, so the browser can't call them from greensidejourneys.com directly.
// Same-origin call here -> server-to-server fetch -> no CORS issue.

const UPSTREAM_URLS = [
  // Current-event leaderboard page (Next.js).
  "https://www.pgatour.com/leaderboard",
  // Legacy alias kept around in case the new path 404s on tournament weeks.
  "https://www.pgatour.com/leaderboard.html",
];

const UA =
  "Mozilla/5.0 (compatible; greensidejourneys-stats/1.0; +https://greensidejourneys.com)";

exports.handler = async (event) => {
  try {
    const html = await fetchFirst(UPSTREAM_URLS);
    const data = extractNextData(html);
    const players = extractPlayers(data);
    const tournament = extractTournamentMeta(data);

    return json(200, { tournament, players, count: players.length });
  } catch (err) {
    return json(502, { error: String(err && err.message || err) });
  }
};

// ---------------------------------------------------------------------------

async function fetchFirst(urls) {
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "user-agent": UA,
          accept: "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      if (!res.ok) { lastErr = new Error(`${url} -> ${res.status}`); continue; }
      return await res.text();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("All upstream URLs failed");
}

function extractNextData(html) {
  const m = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!m) throw new Error("__NEXT_DATA__ not found in page");
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    throw new Error("__NEXT_DATA__ JSON parse failed: " + e.message);
  }
}

function extractTournamentMeta(data) {
  const props = data?.props?.pageProps || {};
  const t = props.tournament || props.leaderboard?.tournament || {};
  return {
    id: t.id || t.tournamentId || null,
    name: t.tournamentName || t.name || null,
    par: Number(t.coursePar || t.par || t.coursePars) || null,
    currentRound: Number(t.currentRound || t.roundDisplay) || null,
  };
}

// Walk the JSON looking for arrays of player-shaped objects with rounds[]
// containing fairwaysHit / greensInRegulation. Returns a flat list.
function extractPlayers(data) {
  const candidates = [];
  walk(data, (node) => {
    if (!Array.isArray(node) || node.length === 0) return;
    const sample = node[0];
    if (!sample || typeof sample !== "object") return;
    const hasPlayer = "player" in sample || "playerId" in sample
      || "firstName" in sample || "lastName" in sample || "displayName" in sample;
    const hasRounds = Array.isArray(sample.rounds) || Array.isArray(sample.roundScores)
      || "fairwaysHit" in sample || "greensInRegulation" in sample;
    if (hasPlayer && hasRounds) candidates.push(node);
  });

  // Pick the largest list (typically the full field).
  candidates.sort((a, b) => b.length - a.length);
  const list = candidates[0] || [];

  return list.map(normalizePlayer).filter(Boolean);
}

function normalizePlayer(p) {
  if (!p || typeof p !== "object") return null;
  const player = p.player || p;
  const first = player.firstName || p.firstName || "";
  const last  = player.lastName  || p.lastName  || "";
  const name = (player.displayName || p.displayName || `${first} ${last}`).trim();
  if (!name) return null;

  const rounds = (p.rounds || p.roundScores || []).map((r) => ({
    round:
      Number(r.roundNumber || r.round || r.roundId || r.period) || null,
    strokes:
      numOr(r.strokes, r.score, r.scoreTotal, r.total),
    fairwaysHit:
      numOr(r.fairwaysHit, r.fairways, r.drivingAccuracyMade, r.fairwaysHitMade),
    fairwaysOf:
      numOr(r.fairwaysHitOf, r.fairwaysPossible, r.fairwaysTotal),
    greensInRegulation:
      numOr(r.greensInRegulation, r.gir, r.greensHit, r.greensInRegulationMade),
    girOf:
      numOr(r.greensInRegulationOf, r.greensPossible, r.greensTotal),
    thru: numOr(r.thru, r.holesPlayed, r.holesCompleted),
  }));

  return {
    id: player.id || player.playerId || p.playerId || null,
    name,
    shortName: player.shortName || p.shortName || null,
    position: p.position || p.positionDisplay || player.position || null,
    total: p.total || p.scoreTotal || null,
    thru: numOr(p.thru, p.holesPlayed),
    rounds,
  };
}

function numOr(...vals) {
  for (const v of vals) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (!isNaN(n)) return n;
  }
  return null;
}

// Depth-limited walk to avoid pathological recursion.
function walk(node, visit, depth = 0) {
  if (depth > 25 || node === null || node === undefined) return;
  visit(node);
  if (Array.isArray(node)) {
    for (const v of node) walk(v, visit, depth + 1);
  } else if (typeof node === "object") {
    for (const k of Object.keys(node)) walk(node[k], visit, depth + 1);
  }
}

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=20",
    },
    body: JSON.stringify(body),
  };
}
