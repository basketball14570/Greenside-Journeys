// DraftKings DFS demo data — Quail Hollow main slate.
// Once the DK salaries scraper / partner feed is wired this is replaced.

export type DfsPlayer = {
  id: string;
  name: string;
  salary: number;
  projection: number;       // projected DK fantasy points
  ownership: number;        // projected % owned
  wave: "AM" | "PM";
  windAdj: number;          // strokes-gained delta from current wind model (signed)
  ceiling: number;          // simulated 90th percentile
  floor: number;            // simulated 10th percentile
};

export const DFS_PLAYERS: DfsPlayer[] = [
  { id: "scheffler",  name: "Scottie Scheffler",  salary: 11200, projection: 91.2, ownership: 32, wave: "AM", windAdj: +1.1, ceiling: 128, floor: 62 },
  { id: "mcilroy",    name: "Rory McIlroy",       salary: 10800, projection: 88.4, ownership: 28, wave: "AM", windAdj: +1.4, ceiling: 132, floor: 58 },
  { id: "schauffele", name: "Xander Schauffele",  salary: 10200, projection: 84.6, ownership: 22, wave: "AM", windAdj: +0.7, ceiling: 121, floor: 55 },
  { id: "morikawa",   name: "Collin Morikawa",    salary: 9800,  projection: 80.1, ownership: 19, wave: "AM", windAdj: -0.2, ceiling: 115, floor: 52 },
  { id: "cantlay",    name: "Patrick Cantlay",    salary: 9400,  projection: 77.5, ownership: 17, wave: "PM", windAdj: -1.6, ceiling: 108, floor: 48 },
  { id: "hovland",    name: "Viktor Hovland",     salary: 9100,  projection: 76.3, ownership: 14, wave: "PM", windAdj: -0.9, ceiling: 110, floor: 47 },
  { id: "thomas",     name: "Justin Thomas",      salary: 8800,  projection: 73.8, ownership: 12, wave: "PM", windAdj: -0.5, ceiling: 105, floor: 45 },
  { id: "burns",      name: "Sam Burns",          salary: 8600,  projection: 72.4, ownership: 11, wave: "PM", windAdj: -0.7, ceiling: 102, floor: 44 },
  { id: "spieth",     name: "Jordan Spieth",      salary: 8400,  projection: 71.6, ownership: 13, wave: "AM", windAdj: +0.4, ceiling: 104, floor: 42 },
  { id: "aberg",      name: "Ludvig Åberg",       salary: 8200,  projection: 70.9, ownership: 15, wave: "AM", windAdj: +0.6, ceiling: 106, floor: 41 },
  { id: "finau",      name: "Tony Finau",         salary: 7900,  projection: 68.2, ownership: 9,  wave: "PM", windAdj: -0.3, ceiling: 98,  floor: 40 },
  { id: "homa",       name: "Max Homa",           salary: 7700,  projection: 66.8, ownership: 8,  wave: "AM", windAdj: +0.5, ceiling: 96,  floor: 39 },
];

// Naive greedy "best 6 by points-per-$1k under cap" so the page has a real
// example lineup. The real optimizer (Monte Carlo + correlation) replaces this.
export function buildSampleLineup(players: DfsPlayer[], cap = 50000) {
  const sorted = [...players].sort(
    (a, b) => b.projection / b.salary - a.projection / a.salary,
  );
  const picked: DfsPlayer[] = [];
  let remaining = cap;
  for (const p of sorted) {
    if (picked.length === 6) break;
    if (p.salary <= remaining) {
      picked.push(p);
      remaining -= p.salary;
    }
  }
  return { picks: picked, remainingSalary: remaining };
}
