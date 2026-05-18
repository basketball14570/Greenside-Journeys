import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepts a JSON blob in the same shape as the user's standalone ownership
// HTML viewer ({"<tournament>": {meta:{...}, players:[{name, salary, own}]}}),
// validates it, and emits ready-to-paste TypeScript that can be appended
// to OWNERSHIP_DATA in lib/data/ownership.ts. The endpoint never writes to
// disk on its own — keeps the source-of-truth in the repo where every
// change is reviewed and committed.

const EntrySchema = z.object({
  name: z.string().min(1),
  salary: z.number().int().nonnegative(),
  own: z.number().min(0).max(100),
});

const MetaSchema = z.object({
  course: z.string().min(1),
  type: z.string().min(1),
  par: z.number().int().min(60).max(80),
  yards: z.number().int().min(5000).max(9000),
});

const TournamentSchema = z.object({
  meta: MetaSchema,
  players: z.array(EntrySchema).min(1),
});

// Outer: { "Tournament Name 2026": Tournament, ... }
const PayloadSchema = z.record(TournamentSchema);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "schema mismatch", issues: parsed.error.issues.slice(0, 5) },
      { status: 400 },
    );
  }

  const tournaments = Object.entries(parsed.data);
  const summary = tournaments.map(([name, t]) => ({
    name,
    field: t.players.length,
    top_chalk: t.players
      .slice()
      .sort((a, b) => b.own - a.own)
      .slice(0, 3)
      .map((p) => `${p.name} ${p.own.toFixed(1)}%`),
  }));

  const tsSnippet = tournaments
    .map(
      ([name, t]) =>
        `  ${JSON.stringify(name)}: { meta: ${JSON.stringify(t.meta)}, players: [${t.players
          .map((p) => `{ name: ${JSON.stringify(p.name)}, salary: ${p.salary}, own: ${p.own} }`)
          .join(", ")}] },`,
    )
    .join("\n");

  return NextResponse.json(
    {
      accepted: tournaments.length,
      summary,
      // Paste this into OWNERSHIP_DATA in lib/data/ownership.ts. Also add
      // the tournament name to TOURNAMENT_ORDER at the appropriate position.
      ts_snippet: tsSnippet,
      next_steps: [
        "Copy `ts_snippet` into OWNERSHIP_DATA in lib/data/ownership.ts",
        "Add each tournament name to TOURNAMENT_ORDER (most recent first)",
        "Run `npx tsc --noEmit` to verify",
        "Commit + push",
      ],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
