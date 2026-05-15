import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Greenside brand palette (carried from marketing site)
        green: {
          deep: "#0a3d2e",
          mid: "#0f5c3f",
          bright: "#1a7a4a",
          light: "#2a9960",
        },
        gold: {
          DEFAULT: "#c9a84c",
          light: "#e8c96e",
        },
        cream: {
          DEFAULT: "#f5f0e8",
          dark: "#e8e0d0",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          mid: "#4a4a4a",
          light: "#8a8a8a",
        },
        paper: "#fefcf8",
        // Edge-specific semantic colors (live data states)
        signal: {
          positive: "#1a7a4a",
          negative: "#b04848",
          warning: "#c9a84c",
          neutral: "#8a8a8a",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(10, 61, 46, 0.06), 0 4px 16px rgba(10, 61, 46, 0.04)",
        elevated: "0 4px 24px rgba(10, 61, 46, 0.12)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
