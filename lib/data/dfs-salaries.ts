// the Memorial Tournament — Muirfield Village Golf Club, Dublin, OH.
// DraftKings main slate salaries + AvgPointsPerGame (DK season scoring, a
// recent-form proxy). Imported from the DK salary CSV; replace each week.
//
// Weekly upkeep:
//   1. New event: paste the new CSV into RAW_DK_SALARIES, bump DK_EVENT,
//      and reset DK_WITHDRAWALS to [].
//   2. Mid-week withdrawals (fields finalize Tuesday): add the player's name
//      to DK_WITHDRAWALS — they drop out of the field everywhere (ownership,
//      optimizer, leverage) without touching the salary rows.

export type DkSalaryRow = {
  name: string;
  salary: number;
  ppg: number; // DK AvgPointsPerGame
};

export const DK_EVENT = "the Memorial Tournament";
export const DK_ROSTER_SIZE = 6;
export const DK_SALARY_CAP = 50000;

// Players who withdrew after the DK slate posted. Names are matched
// loosely (case/space/punctuation-insensitive) against the salary rows.
export const DK_WITHDRAWALS: string[] = [];

const RAW_DK_SALARIES: DkSalaryRow[] = [
  { name: "Scottie Scheffler", salary: 13500, ppg: 106.14 },
  { name: "Rory McIlroy", salary: 11500, ppg: 82.6 },
  { name: "Cameron Young", salary: 10300, ppg: 88.86 },
  { name: "Ludvig Aberg", salary: 10100, ppg: 81.88 },
  { name: "Xander Schauffele", salary: 9800, ppg: 76.41 },
  { name: "Matt Fitzpatrick", salary: 9600, ppg: 88.09 },
  { name: "Si Woo Kim", salary: 9400, ppg: 88.5 },
  { name: "Russell Henley", salary: 9300, ppg: 74.54 },
  { name: "Patrick Cantlay", salary: 9200, ppg: 71.73 },
  { name: "Tommy Fleetwood", salary: 9100, ppg: 74.58 },
  { name: "Ben Griffin", salary: 9000, ppg: 67.67 },
  { name: "Min Woo Lee", salary: 8900, ppg: 81.82 },
  { name: "Sam Burns", salary: 8800, ppg: 69.58 },
  { name: "Hideki Matsuyama", salary: 8700, ppg: 76.23 },
  { name: "Robert MacIntyre", salary: 8600, ppg: 72.96 },
  { name: "Rickie Fowler", salary: 8500, ppg: 71.31 },
  { name: "Justin Thomas", salary: 8400, ppg: 67.17 },
  { name: "Maverick McNealy", salary: 8300, ppg: 74.85 },
  { name: "Chris Gotterup", salary: 8200, ppg: 80.38 },
  { name: "Adam Scott", salary: 8100, ppg: 78.96 },
  { name: "Alex Smalley", salary: 8000, ppg: 76.75 },
  { name: "J.J. Spaun", salary: 8000, ppg: 60.18 },
  { name: "Jordan Spieth", salary: 7900, ppg: 73.14 },
  { name: "Harris English", salary: 7900, ppg: 76.35 },
  { name: "Kurt Kitayama", salary: 7800, ppg: 71.54 },
  { name: "Justin Rose", salary: 7800, ppg: 70.3 },
  { name: "Nicolai Hojgaard", salary: 7700, ppg: 77.43 },
  { name: "Sepp Straka", salary: 7700, ppg: 70.69 },
  { name: "Jake Knapp", salary: 7600, ppg: 86.94 },
  { name: "Shane Lowry", salary: 7600, ppg: 73.67 },
  { name: "Aaron Rai", salary: 7500, ppg: 67 },
  { name: "Jason Day", salary: 7500, ppg: 67.58 },
  { name: "Akshay Bhatia", salary: 7400, ppg: 70.46 },
  { name: "Jacob Bridgeman", salary: 7400, ppg: 80.77 },
  { name: "Gary Woodland", salary: 7300, ppg: 63.29 },
  { name: "Wyndham Clark", salary: 7300, ppg: 73.08 },
  { name: "Alex Noren", salary: 7200, ppg: 68.33 },
  { name: "Ryo Hisatsune", salary: 7200, ppg: 74.94 },
  { name: "Corey Conners", salary: 7100, ppg: 65.33 },
  { name: "Mac Meissner", salary: 7100, ppg: 67.12 },
  { name: "Sahith Theegala", salary: 7000, ppg: 73.8 },
  { name: "Keegan Bradley", salary: 7000, ppg: 59.65 },
  { name: "Kristoffer Reitan", salary: 6900, ppg: 69.54 },
  { name: "Pierceson Coody", salary: 6900, ppg: 68.38 },
  { name: "Ryan Gerard", salary: 6900, ppg: 77 },
  { name: "Harry Hall", salary: 6800, ppg: 57.61 },
  { name: "Nick Taylor", salary: 6800, ppg: 68.87 },
  { name: "Sam Stevens", salary: 6800, ppg: 71 },
  { name: "Eric Cole", salary: 6700, ppg: 66.08 },
  { name: "Alex Fitzpatrick", salary: 6700, ppg: 79.92 },
  { name: "Daniel Berger", salary: 6700, ppg: 65.88 },
  { name: "J.T. Poston", salary: 6600, ppg: 57.73 },
  { name: "Brian Harman", salary: 6600, ppg: 64.29 },
  { name: "Tony Finau", salary: 6600, ppg: 64.61 },
  { name: "Sungjae Im", salary: 6500, ppg: 58.5 },
  { name: "Bud Cauley", salary: 6500, ppg: 63.58 },
  { name: "Ryan Fox", salary: 6500, ppg: 65.46 },
  { name: "Matthew McCarty", salary: 6400, ppg: 63.79 },
  { name: "Denny McCarthy", salary: 6400, ppg: 58.54 },
  { name: "Andrew Novak", salary: 6400, ppg: 60.2 },
  { name: "Taylor Pendrith", salary: 6300, ppg: 60.25 },
  { name: "Patrick Rodgers", salary: 6300, ppg: 66.88 },
  { name: "Tom Hoge", salary: 6300, ppg: 60.16 },
  { name: "Michael Kim", salary: 6200, ppg: 64.57 },
  { name: "Nicolas Echavarria", salary: 6200, ppg: 55.17 },
  { name: "Billy Horschel", salary: 6200, ppg: 54.87 },
  { name: "Brandt Snedeker", salary: 6100, ppg: 57.44 },
  { name: "Matt Kuchar", salary: 6100, ppg: 46.61 },
  { name: "Mark Hubbard", salary: 6100, ppg: 56.23 },
  { name: "Lucas Glover", salary: 6000, ppg: 42.96 },
  { name: "Jhonattan Vegas", salary: 6000, ppg: 50.19 },
  { name: "Brian Campbell", salary: 6000, ppg: 38.97 },
];

function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// The live field: the DK slate minus anyone who has withdrawn.
const withdrawn = new Set(DK_WITHDRAWALS.map(normalizeName));
export const DK_SALARIES: DkSalaryRow[] = RAW_DK_SALARIES.filter(
  (r) => !withdrawn.has(normalizeName(r.name)),
);
