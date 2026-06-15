// U.S. Open — Shinnecock Hills Golf Club, Southampton, NY.
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

export const DK_EVENT = "U.S. Open";
export const DK_ROSTER_SIZE = 6;
export const DK_SALARY_CAP = 50000;

// Players who withdrew after the DK slate posted. Names are matched
// loosely (case/space/punctuation-insensitive) against the salary rows.
export const DK_WITHDRAWALS: string[] = [];

// Manual ownership overrides for this week. The salary+value+DataGolf
// model can't see narrative chalk (recent winners drive heavy ownership
// regardless of salary value) or PPG inflation (one big finish
// over-weighting the season average). Use this map to set a hard %
// for specific players this week, expressed as the displayed projOwn.
//   - Key: player name (loose-matched, accents/punctuation insensitive).
//   - Value: % owned to display (0..100).
// Reset every week alongside the salaries.
export const DK_OWNERSHIP_OVERRIDES: Record<string, number> = {};

const RAW_DK_SALARIES: DkSalaryRow[] = [
  { name: "Scottie Scheffler", salary: 14900, ppg: 103.5 },
  { name: "Rory McIlroy", salary: 12200, ppg: 82.23 },
  { name: "Jon Rahm", salary: 11500, ppg: 79.53 },
  { name: "Bryson DeChambeau", salary: 11000, ppg: 67.37 },
  { name: "Cameron Young", salary: 10500, ppg: 85.17 },
  { name: "Xander Schauffele", salary: 10100, ppg: 74.71 },
  { name: "Tommy Fleetwood", salary: 9700, ppg: 76.68 },
  { name: "Brooks Koepka", salary: 9400, ppg: 60.6 },
  { name: "Ludvig Aberg", salary: 9200, ppg: 80.5 },
  { name: "Matt Fitzpatrick", salary: 8900, ppg: 86.42 },
  { name: "Tyrrell Hatton", salary: 8700, ppg: 61.81 },
  { name: "Collin Morikawa", salary: 8500, ppg: 72.86 },
  { name: "Justin Rose", salary: 8400, ppg: 66.88 },
  { name: "Justin Thomas", salary: 8300, ppg: 67.5 },
  { name: "Chris Gotterup", salary: 8200, ppg: 79.82 },
  { name: "Viktor Hovland", salary: 8100, ppg: 68.89 },
  { name: "Russell Henley", salary: 8000, ppg: 74.04 },
  { name: "Patrick Reed", salary: 7900, ppg: 72.33 },
  { name: "Wyndham Clark", salary: 7800, ppg: 75.96 },
  { name: "Sam Burns", salary: 7700, ppg: 71.75 },
  { name: "Hideki Matsuyama", salary: 7600, ppg: 74.71 },
  { name: "J.J. Spaun", salary: 7500, ppg: 61.2 },
  { name: "Joaquin Niemann", salary: 7400, ppg: 70.62 },
  { name: "Patrick Cantlay", salary: 7300, ppg: 72.17 },
  { name: "Si Woo Kim", salary: 7200, ppg: 87.88 },
  { name: "Shane Lowry", salary: 7100, ppg: 73.71 },
  { name: "Jordan Spieth", salary: 7100, ppg: 69.43 },
  { name: "Ben Griffin", salary: 7000, ppg: 64.31 },
  { name: "Robert MacIntyre", salary: 7000, ppg: 70.39 },
  { name: "Sepp Straka", salary: 7000, ppg: 69.32 },
  { name: "Min Woo Lee", salary: 6900, ppg: 78 },
  { name: "Kristoffer Reitan", salary: 6900, ppg: 71.1 },
  { name: "Cameron Smith", salary: 6900, ppg: 61.97 },
  { name: "Aaron Rai", salary: 6800, ppg: 63.73 },
  { name: "Jake Knapp", salary: 6800, ppg: 86.94 },
  { name: "Maverick McNealy", salary: 6800, ppg: 75.29 },
  { name: "Alex Smalley", salary: 6800, ppg: 72.17 },
  { name: "Nicolai Hojgaard", salary: 6700, ppg: 70.66 },
  { name: "Harris English", salary: 6700, ppg: 75.96 },
  { name: "Jason Day", salary: 6700, ppg: 63.92 },
  { name: "Rickie Fowler", salary: 6700, ppg: 67.07 },
  { name: "Bud Cauley", salary: 6700, ppg: 68.2 },
  { name: "Akshay Bhatia", salary: 6600, ppg: 66.7 },
  { name: "Adam Scott", salary: 6600, ppg: 78.79 },
  { name: "Gary Woodland", salary: 6600, ppg: 63.53 },
  { name: "Ryan Gerard", salary: 6600, ppg: 78.94 },
  { name: "Alex Fitzpatrick", salary: 6600, ppg: 80.3 },
  { name: "Corey Conners", salary: 6500, ppg: 60.68 },
  { name: "Kurt Kitayama", salary: 6500, ppg: 70.54 },
  { name: "Jacob Bridgeman", salary: 6500, ppg: 79.73 },
  { name: "David Puig", salary: 6500, ppg: 70.87 },
  { name: "Daniel Berger", salary: 6500, ppg: 62.54 },
  { name: "Keegan Bradley", salary: 6400, ppg: 60.93 },
  { name: "Sungjae Im", salary: 6400, ppg: 59.25 },
  { name: "Alex Noren", salary: 6400, ppg: 65.46 },
  { name: "Sahith Theegala", salary: 6400, ppg: 73.32 },
  { name: "Carlos Ortiz", salary: 6400, ppg: 64.94 },
  { name: "Ryan Fox", salary: 6300, ppg: 68.12 },
  { name: "Nick Taylor", salary: 6300, ppg: 67.82 },
  { name: "Dustin Johnson", salary: 6300, ppg: 58.22 },
  { name: "Jackson Koivun", salary: 6300, ppg: 74 },
  { name: "Lucas Herbert", salary: 6300, ppg: 63.18 },
  { name: "J.T. Poston", salary: 6300, ppg: 61.86 },
  { name: "Tom Kim", salary: 6200, ppg: 69.85 },
  { name: "Keith Mitchell", salary: 6200, ppg: 72.4 },
  { name: "Harry Hall", salary: 6200, ppg: 59.38 },
  { name: "Davis Thompson", salary: 6200, ppg: 60.08 },
  { name: "Brian Harman", salary: 6200, ppg: 61.43 },
  { name: "Sam Stevens", salary: 6200, ppg: 67.34 },
  { name: "Michael Kim", salary: 6100, ppg: 63.62 },
  { name: "Andrew Novak", salary: 6100, ppg: 58.66 },
  { name: "Ryo Hisatsune", salary: 6100, ppg: 73.5 },
  { name: "Max Greyserman", salary: 6100, ppg: 57.2 },
  { name: "John Keefer", salary: 6100, ppg: 59.69 },
  { name: "Sudarshan Yellamaraju", salary: 6100, ppg: 73.15 },
  { name: "Pierceson Coody", salary: 6000, ppg: 65.06 },
  { name: "Michael Brennan", salary: 6000, ppg: 58.03 },
  { name: "Matthew McCarty", salary: 6000, ppg: 61.47 },
  { name: "Jayden Trey Schaper", salary: 6000, ppg: 79.64 },
  { name: "Matti Schmid", salary: 6000, ppg: 56.03 },
  { name: "Chris Kirk", salary: 6000, ppg: 54.46 },
  { name: "Andrew Putnam", salary: 5900, ppg: 63.07 },
  { name: "Matthew Jordan", salary: 5900, ppg: 57.68 },
  { name: "Nicolas Echavarria", salary: 5900, ppg: 54.97 },
  { name: "Patrick Rodgers", salary: 5900, ppg: 66.14 },
  { name: "Billy Horschel", salary: 5900, ppg: 55.56 },
  { name: "Caleb Surratt", salary: 5900, ppg: 64.13 },
  { name: "Max McGreevy", salary: 5800, ppg: 53.91 },
  { name: "Emiliano Grillo", salary: 5800, ppg: 51.57 },
  { name: "Laurie Canter", salary: 5800, ppg: 51 },
  { name: "John Parry", salary: 5800, ppg: 66.26 },
  { name: "Peter Uihlein", salary: 5800, ppg: 53.54 },
  { name: "Nathan Kimsey", salary: 5800, ppg: 64.62 },
  { name: "Zac Blair", salary: 5800, ppg: 68.46 },
  { name: "Ben Kohles", salary: 5700, ppg: 62.8 },
  { name: "Adrien Dumont De Chassart", salary: 5700, ppg: 58.85 },
  { name: "Kevin Roy", salary: 5700, ppg: 64.5 },
  { name: "Niklas Norgaard Moller", salary: 5700, ppg: 47.86 },
  { name: "Benjamin James", salary: 5700, ppg: 72.5 },
  { name: "Graeme McDowell", salary: 5700, ppg: 49.15 },
  { name: "Neal Shipley", salary: 5700, ppg: 42.46 },
  { name: "William Mouw", salary: 5600, ppg: 52.77 },
  { name: "Chandler Phillips", salary: 5600, ppg: 50.31 },
  { name: "Jackson Suber", salary: 5600, ppg: 66.46 },
  { name: "Cole Hammer", salary: 5600, ppg: 68.92 },
  { name: "Ben Silverman", salary: 5600, ppg: 55.75 },
  { name: "Ugo Coussaud", salary: 5600, ppg: 64.31 },
  { name: "Dylan Wu", salary: 5600, ppg: 51.83 },
  { name: "Nick Hardy", salary: 5500, ppg: 45.08 },
  { name: "Padraig Harrington", salary: 5500, ppg: 60.23 },
  { name: "Taylor Montgomery", salary: 5500, ppg: 50.04 },
  { name: "Jimmy Stanger", salary: 5500, ppg: 57.71 },
  { name: "Rocco Repetto Taylor", salary: 5500, ppg: 50.57 },
  { name: "Miles Russell", salary: 5500, ppg: 62.62 },
  { name: "Hennie Du Plessis", salary: 5500, ppg: 74.77 },
  { name: "Carl Yuan", salary: 5400, ppg: 53.3 },
  { name: "Adrien Saddier", salary: 5400, ppg: 49.92 },
  { name: "Angel Hidalgo", salary: 5400, ppg: 46.12 },
  { name: "Taihei Sato", salary: 5400, ppg: 0 },
  { name: "Alejandro Tosti", salary: 5400, ppg: 34.81 },
  { name: "James Nicholas", salary: 5400, ppg: 61.39 },
  { name: "Harry Higgs", salary: 5400, ppg: 47.96 },
  { name: "T.K. Kim", salary: 5300, ppg: 0 },
  { name: "Brandon Wu", salary: 5300, ppg: 50.69 },
  { name: "Preston Stout", salary: 5300, ppg: 29.5 },
  { name: "Jackson Herrington", salary: 5300, ppg: 21 },
  { name: "Ethan Fang", salary: 5300, ppg: 17.5 },
  { name: "Filippo Celli", salary: 5300, ppg: 36.31 },
  { name: "Bryan Lee", salary: 5300, ppg: 8.5 },
  { name: "Cooper Dossey", salary: 5200, ppg: 82.31 },
  { name: "Jackson Van Paris", salary: 5200, ppg: 55.27 },
  { name: "Hamilton Coleman", salary: 5200, ppg: 35 },
  { name: "Ryder Cowan", salary: 5200, ppg: 0 },
  { name: "Chase Kyes", salary: 5200, ppg: 0 },
  { name: "Eric Lee", salary: 5200, ppg: 0 },
  { name: "Robbie Higgins", salary: 5200, ppg: 41.12 },
  { name: "Spencer Tibbits", salary: 5200, ppg: 0 },
  { name: "Marek Fleming", salary: 5100, ppg: 0 },
  { name: "Vaughn Harber", salary: 5100, ppg: 0 },
  { name: "Manav Shah", salary: 5100, ppg: 0 },
  { name: "Brandon Holtz", salary: 5100, ppg: 9 },
  { name: "Mason Howell", salary: 5100, ppg: 26 },
  { name: "Kaito Onishi", salary: 5100, ppg: 46.78 },
  { name: "Marcelo Rozo", salary: 5100, ppg: 37.75 },
  { name: "Jake Sollon", salary: 5100, ppg: 32 },
  { name: "Jack Schoenberger", salary: 5100, ppg: 0 },
  { name: "Logan Reilly", salary: 5000, ppg: 0 },
  { name: "Matthew Robles", salary: 5000, ppg: 0 },
  { name: "J.B. Holmes", salary: 5000, ppg: 15.5 },
  { name: "Ryuichi Oiwa", salary: 5000, ppg: 0 },
  { name: "Jake Peacock", salary: 5000, ppg: 53.38 },
  { name: "Giuseppe Puebla", salary: 5000, ppg: 13.5 },
  { name: "Mateo Pulcini", salary: 5000, ppg: 8.5 },
  { name: "Greyson Leach", salary: 5000, ppg: 0 },
  { name: "Jackson Ormond", salary: 5000, ppg: 19.5 },
  { name: "Arni Sveinsson", salary: 5000, ppg: 0 },
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
