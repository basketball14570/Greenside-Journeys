import { describe, it, expect } from "vitest";
import { parseSalariesCsv } from "./dk-salaries";

describe("parseSalariesCsv", () => {
  it("parses the standard DK salaries export", () => {
    const csv = [
      "Position,Name + ID,Name,ID,Roster Position,Salary,Game Info,TeamAbbrev,AvgPointsPerGame",
      "G,Scottie Scheffler (11195220),Scottie Scheffler,11195220,G,11700,PGA,PGA,95.2",
      'G,"Kim, Si Woo (11196000)","Si Woo Kim",11196000,G,7800,PGA,PGA,72.1',
    ].join("\n");
    const out = parseSalariesCsv(csv);
    expect(out).toEqual([
      { player_name: "Scottie Scheffler", salary: 11700 },
      { player_name: "Si Woo Kim", salary: 7800 },
    ]);
  });

  it("dedupes Showdown CPT/FLEX duplicate rows and skips junk", () => {
    const csv = [
      "Name,Salary",
      "Scottie Scheffler,11700",
      "Scottie Scheffler,15000",
      ",5000",
      "Tom Kim,0",
    ].join("\n");
    expect(parseSalariesCsv(csv)).toEqual([
      { player_name: "Scottie Scheffler", salary: 11700 },
    ]);
  });

  it("returns nothing without the required headers", () => {
    expect(parseSalariesCsv("foo,bar\n1,2")).toEqual([]);
  });
});
