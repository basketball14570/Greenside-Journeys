import type { Config } from "tailwindcss";

// Palette + typography from Claude Design handoff (dfs-bet-dashboard).
// Dark fairway green aesthetic — bright `green` is the live/positive accent,
// `amber` for wind warnings, `red` for negative EV / hedge needed.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a1f14",
        bgDeep: "#06140c",
        surface: {
          1: "#102619",
          2: "#173326",
          3: "#1e4030",
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.06)",
          strong: "rgba(255,255,255,0.12)",
        },
        text: {
          DEFAULT: "#f0ebe0",
          dim: "#a8b3ac",
          muted: "#6c7a72",
        },
        fairway: {
          DEFAULT: "#8ee68e",
          deep: "#3f8a52",
        },
        amber: {
          DEFAULT: "#f5c558",
          deep: "#a07a1f",
        },
        red: {
          DEFAULT: "#e07868",
          deep: "#7a3027",
        },
        sky: {
          DEFAULT: "#7cc0e8",
        },
      },
      fontFamily: {
        sans: ['"Instrument Sans"', "-apple-system", "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', '"Iowan Old Style"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        ui: "0.04em",
        label: "0.1em",
      },
    },
  },
  plugins: [],
};

export default config;
