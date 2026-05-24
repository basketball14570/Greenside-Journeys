import { describe, it, expect } from "vitest";
import {
  parseEntriesCsv,
  survivalDistribution,
  marginVsCut,
  analyzeEntry,
  summarizeByContest,
  normalizeName,
  buildNameResolver,
  type CutLookup,
} from "./cut-sweat";

const CSV = [
  "Entry ID,Contest Name,Contest ID,Entry Fee,G,G,G,G,G,G",
  '111,"PGA $150K Driver [$30K to 1st, Single Entry]",998,$5,Scottie Scheffler (1),Rory McIlroy (2),Tom Kim (3),Eric Cole (4),Sam Burns (5),Max Homa (6)',
  '112,"PGA $150K Driver [$30K to 1st, Single Entry]",998,$5,Ludvig Åberg (7),Rory McIlroy (2),Tom Kim (3),Eric Cole (4),Sam Burns (5),Max Homa (6)',
  "",
].join("\n");

describe("parseEntriesCsv", () => {
  it("parses quoted contest names with embedded commas and strips player IDs", () => {
    const entries = parseEntriesCsv(CSV);
    expect(entries).toHaveLength(2);
    expect(entries[0].contest).toBe("PGA $150K Driver [$30K to 1st, Single Entry]");
    expect(entries[0].contestId).toBe("998");
    expect(entries[0].entryFee).toBe(5);
    expect(entries[0].golfers).toEqual([
      "Scottie Scheffler",
      "Rory McIlroy",
      "Tom Kim",
      "Eric Cole",
      "Sam Burns",
      "Max Homa",
    ]);
  });

  it("ignores blank trailing rows", () => {
    expect(parseEntriesCsv(CSV)).toHaveLength(2);
  });
});

describe("normalizeName", () => {
  it("ignores middle initials so CSV and ESPN names match", () => {
    expect(normalizeName("Jordan L. Smith")).toBe(normalizeName("Jordan Smith"));
    // Tokens are sorted, so output is alphabetical regardless of input order.
    expect(normalizeName("Si Woo Kim")).toBe("kim si woo");
    expect(normalizeName("Scottie Scheffler")).toBe("scheffler scottie");
  });

  it("matches regardless of name order so DataGolf 'Last, First' joins DK 'First Last'", () => {
    expect(normalizeName("Scheffler, Scottie")).toBe(normalizeName("Scottie Scheffler"));
    expect(normalizeName("Kim, Si Woo")).toBe(normalizeName("Si Woo Kim"));
    expect(normalizeName("McIlroy, Rory")).toBe(normalizeName("Rory McIlroy"));
  });
});

describe("buildNameResolver", () => {
  const live = [
    { name: "Zach Bauchou", points: 40 },
    { name: "Johnny Keefer", points: 35 },
    { name: "Seung Yul Noh", points: 30 },
    { name: "Scottie Scheffler", points: 50 },
  ];
  const resolve = buildNameResolver(live);

  it("matches nickname / spelling variants via last name + first initial", () => {
    expect(resolve("Zachary Bauchou")?.points).toBe(40); // Zach ↔ Zachary
    expect(resolve("John Keefer")?.points).toBe(35); // John ↔ Johnny
    expect(resolve("Seung-Yul Noh")?.points).toBe(30); // hyphen ↔ space
  });

  it("still matches exact names", () => {
    expect(resolve("Scottie Scheffler")?.points).toBe(50);
  });

  it("refuses an ambiguous last-name+initial fallback", () => {
    const ambiguous = buildNameResolver([
      { name: "Chan Kim", points: 1 },
      { name: "Charlie Kim", points: 2 },
    ]);
    // "C. Kim" could be either, so no fuzzy match is returned.
    expect(ambiguous("C Kim")).toBeNull();
  });

  it("maps special Latin letters so ESPN ø/accents match a DK export", () => {
    expect(normalizeName("Rasmus Højgaard")).toBe(normalizeName("Rasmus Hojgaard"));
    expect(normalizeName("Thorbjørn Olesen")).toBe(normalizeName("Thorbjorn Olesen"));
    expect(normalizeName("Højgaard")).toBe("hojgaard");
    expect(normalizeName("Ludvig Åberg")).toBe(normalizeName("Ludvig Aberg"));
  });
});

describe("survivalDistribution", () => {
  it("sums to 1 and matches a hand-computed 2-golfer case", () => {
    const d = survivalDistribution([0.6, 0.5]);
    // P(0)=.4*.5=.2, P(1)=.6*.5+.4*.5=.5, P(2)=.6*.5=.3
    expect(d[0]).toBeCloseTo(0.2, 6);
    expect(d[1]).toBeCloseTo(0.5, 6);
    expect(d[2]).toBeCloseTo(0.3, 6);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });

  it("is deterministic for certainties", () => {
    expect(survivalDistribution([1, 1, 0])).toEqual([0, 0, 1, 0]);
  });

  it("clamps out-of-range probabilities", () => {
    const d = survivalDistribution([1.4, -0.2]);
    expect(d[1]).toBeCloseTo(1, 6);
  });
});

describe("marginVsCut", () => {
  it("positive when ahead of the cut", () => {
    expect(marginVsCut(-7, -6)).toBe(1); // -7 is 1 better than a -6 cut
    expect(marginVsCut(-5, -6)).toBe(-1); // 1 on the wrong side
  });
});

describe("analyzeEntry", () => {
  const lookup: CutLookup = new Map([
    [normalizeName("Scottie Scheffler"), { makeCutProb: 0.99, scoreToPar: -7, thru: 18, isCut: false }],
    [normalizeName("Rory McIlroy"), { makeCutProb: 0.9, scoreToPar: -6, thru: 18, isCut: false }],
    [normalizeName("Tom Kim"), { makeCutProb: 0.2, scoreToPar: -3, thru: 18, isCut: false }],
  ]);

  it("uses isCut=true → 0 prob, missing golfer → 0.5 and found=false", () => {
    const entries = parseEntriesCsv(CSV);
    const o = analyzeEntry(entries[0], lookup, -6);
    const scottie = o.golfers.find((g) => g.name === "Scottie Scheffler")!;
    expect(scottie.found).toBe(true);
    expect(scottie.margin).toBe(1);
    const unknown = o.golfers.find((g) => g.name === "Eric Cole")!;
    expect(unknown.found).toBe(false);
    expect(unknown.makeCutProb).toBe(0.5);
    expect(o.expectedAlive).toBeGreaterThan(0);
    expect(o.distribution.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
});

describe("summarizeByContest", () => {
  it("groups entries and accumulates expected survival per level", () => {
    const entries = parseEntriesCsv(CSV);
    const lookup: CutLookup = new Map();
    const summaries = summarizeByContest(entries, lookup, -6);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].entries).toBe(2);
    // 7 levels for 6 golfers; total expectation across levels == entries.
    const total = summaries[0].expectedByLevel.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(2, 6);
  });
});
