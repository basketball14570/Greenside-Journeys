import { describe, it, expect } from "vitest";
import {
  parsePayoutStructure,
  prizeForRank,
  prizeForRankWithTies,
  parseStandingsCsv,
  currentRoi,
  findMyEntries,
} from "./payouts";

const LADDER = `1st
$200,000
2nd
$75,000
3rd
$30,000
4th
$15,000
7th - 8th
$4,000
41st - 50th
$500
1,401st - 2,806th
$45`;

const STANDINGS = [
  "Rank,EntryId,EntryName,TimeRemaining,Points,Lineup,,Player,Roster Position,%Drafted,FPTS",
  "1,111,Adolik (1/2),198,485,G Si Woo Kim G Jordan Spieth G Sungjae Im G Rico Hoey G Zachary Bauchou G Jackson Suber,,Si Woo Kim,G,34.36%,99.5",
  "2,222,me_one,198,471.5,G Si Woo Kim G Ryo Hisatsune G Sungjae Im G Stephan Jaeger G Tony Finau G Tom Hoge,,Scottie Scheffler,G,27.11%,77",
  "2,333,other,194,471.5,G Si Woo Kim G Sungjae Im G Mac Meissner G Max Greyserman G Chris Kirk G Zachary Bauchou,,Jordan Spieth,G,26.94%,65.5",
  "4,444,me_two,202,467.5,G Si Woo Kim G Jordan Spieth G Sungjae Im G Stephan Jaeger G Zachary Bauchou G Adrien Saddier,,Brooks Koepka,G,19.97%,68",
].join("\n");

describe("parsePayoutStructure", () => {
  it("parses single ranks and ranges with commas", () => {
    const t = parsePayoutStructure(LADDER);
    expect(t[0]).toEqual({ minRank: 1, maxRank: 1, prize: 200000 });
    expect(t.find((x) => x.minRank === 7)).toEqual({ minRank: 7, maxRank: 8, prize: 4000 });
    expect(t.find((x) => x.minRank === 1401)).toEqual({ minRank: 1401, maxRank: 2806, prize: 45 });
  });
});

describe("prizeForRank", () => {
  it("looks up the tier containing a rank", () => {
    expect(prizeForRank(1, parsePayoutStructure(LADDER))).toBe(200000);
    expect(prizeForRank(8, parsePayoutStructure(LADDER))).toBe(4000);
    expect(prizeForRank(45, parsePayoutStructure(LADDER))).toBe(500);
    expect(prizeForRank(99999, parsePayoutStructure(LADDER))).toBe(0);
  });
});

describe("prizeForRankWithTies", () => {
  it("averages prizes across the positions a tie occupies", () => {
    const t = parsePayoutStructure(LADDER);
    // 3-way tie at rank 2 → positions 2,3,4 → (75000+30000+15000)/3
    expect(prizeForRankWithTies(2, 3, t)).toBeCloseTo((75000 + 30000 + 15000) / 3, 4);
    expect(prizeForRankWithTies(1, 1, t)).toBe(200000);
  });
});

describe("parseStandingsCsv", () => {
  it("splits the dual entry/player tables and counts ties", () => {
    const s = parseStandingsCsv(STANDINGS);
    expect(s.entries).toHaveLength(4);
    expect(s.entries[0].golfers).toHaveLength(6);
    expect(s.entries[0].golfers[0]).toBe("Si Woo Kim");
    expect(s.tieCounts.get(2)).toBe(2); // two entries share rank 2
    expect(s.players.find((p) => p.name === "Scottie Scheffler")?.pctDrafted).toBeCloseTo(27.11);
    expect(s.players[0].fpts).toBeCloseTo(99.5);
  });
});

describe("findMyEntries + currentRoi", () => {
  it("matches by entryId and computes if-it-ended-now ROI with tie splits", () => {
    const s = parseStandingsCsv(STANDINGS);
    const tiers = parsePayoutStructure(LADDER);
    const mine = findMyEntries(s.entries, { entryIds: new Set(["222", "444"]) });
    expect(mine.map((e) => e.entryId).sort()).toEqual(["222", "444"]);
    const roi = currentRoi(mine, tiers, s.tieCounts, 5);
    // entry 222 is rank 2 in a 2-way tie → positions 2,3 → (75000+30000)/2=52500
    // entry 444 is rank 4 → 15000. fees = 2*5 = 10.
    expect(roi.prizes).toBeCloseTo((75000 + 30000) / 2 + 15000, 2);
    expect(roi.fees).toBe(10);
    expect(roi.cashes).toBe(2);
    expect(roi.roi).toBeCloseTo((roi.prizes - 10) / 10, 6);
  });

  it("matches by username when no entryIds given", () => {
    const s = parseStandingsCsv(STANDINGS);
    const mine = findMyEntries(s.entries, { username: "me_one" });
    expect(mine).toHaveLength(1);
    expect(mine[0].entryId).toBe("222");
  });
});
