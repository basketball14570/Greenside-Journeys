import type { DgProjection } from "@/lib/data/datagolf";

// CJ CUP Byron Nelson field (TPC Craig Ranch) — used as a fallback so
// model-driven views render a real field when DATAGOLF_API_KEY is missing
// or the upstream request fails, rather than an empty table.
export const DEMO_PROJECTIONS: DgProjection[] = [
  { player_name: "Scottie Scheffler", win: 0.31, top5: 0.61, top10: 0.74, top20: 0.87, makeCut: 0.95 },
  { player_name: "Si Woo Kim", win: 0.061, top5: 0.24, top10: 0.38, top20: 0.6, makeCut: 0.85 },
  { player_name: "Jordan Spieth", win: 0.04, top5: 0.18, top10: 0.3, top20: 0.54, makeCut: 0.8 },
  { player_name: "Brooks Koepka", win: 0.021, top5: 0.11, top10: 0.19, top20: 0.4, makeCut: 0.71 },
  { player_name: "Ryo Hisatsune", win: 0.02, top5: 0.11, top10: 0.2, top20: 0.42, makeCut: 0.74 },
  { player_name: "Pierceson Coody", win: 0.019, top5: 0.1, top10: 0.19, top20: 0.4, makeCut: 0.72 },
  { player_name: "Michael Thorbjornsen", win: 0.018, top5: 0.097, top10: 0.18, top20: 0.39, makeCut: 0.71 },
  { player_name: "Davis Thompson", win: 0.018, top5: 0.1, top10: 0.19, top20: 0.4, makeCut: 0.72 },
  { player_name: "Wyndham Clark", win: 0.017, top5: 0.096, top10: 0.18, top20: 0.39, makeCut: 0.7 },
  { player_name: "Min Woo Lee", win: 0.016, top5: 0.093, top10: 0.18, top20: 0.38, makeCut: 0.7 },
  { player_name: "Rasmus Højgaard", win: 0.014, top5: 0.085, top10: 0.16, top20: 0.36, makeCut: 0.68 },
  { player_name: "Austin Eckroat", win: 0.013, top5: 0.08, top10: 0.15, top20: 0.35, makeCut: 0.67 },
  { player_name: "Maverick McNealy", win: 0.012, top5: 0.078, top10: 0.15, top20: 0.34, makeCut: 0.67 },
  { player_name: "Beau Hossler", win: 0.011, top5: 0.072, top10: 0.14, top20: 0.33, makeCut: 0.66 },
  { player_name: "Kurt Kitayama", win: 0.011, top5: 0.07, top10: 0.14, top20: 0.32, makeCut: 0.65 },
  { player_name: "Jordan Smith", win: 0.01, top5: 0.066, top10: 0.13, top20: 0.31, makeCut: 0.64 },
  { player_name: "Rico Hoey", win: 0.0095, top5: 0.063, top10: 0.13, top20: 0.3, makeCut: 0.63 },
  { player_name: "Mac Meissner", win: 0.008, top5: 0.056, top10: 0.11, top20: 0.28, makeCut: 0.61 },
];
