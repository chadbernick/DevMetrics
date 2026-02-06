import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors - Hybrid Kanban Design System
        dark: {
          bg: {
            primary: "#0a0a0c",
            secondary: "#111115",
            tertiary: "#16161a",
            card: "#1a1a1f",
            elevated: "#1e1e24",
          },
          border: "#252530",
          "border-subtle": "#1e1e28",
        },
        // Light theme colors
        light: {
          bg: {
            primary: "#ffffff",
            secondary: "#f8fafc",
            tertiary: "#f1f5f9",
          },
          border: "#e2e8f0",
        },
        // Zone-specific backgrounds
        zone: {
          executive: "#0d0d10",
          kanban: "#131317",
          activity: "#111114",
          column: "#14141a",
        },
        // Accent colors - expanded palette
        accent: {
          cyan: "#22d3ee",
          "cyan-dark": "#0891b2",
          blue: "#4d8efa",
          "blue-dark": "#3b82f6",
          purple: "#a78bfa",
          "purple-dark": "#7c3aed",
          pink: "#f472b6",
          "pink-dark": "#db2777",
          green: "#34d399",
          "green-dark": "#10b981",
          yellow: "#fbbf24",
          amber: "#f5a623",
          red: "#fb7185",
          "red-dark": "#ef4444",
          indigo: "#818cf8",
        },
        // DORA rating colors
        rating: {
          elite: "#10b981",
          high: "#3b82f6",
          medium: "#f59e0b",
          low: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(34, 211, 238, 0.15)",
        "glow-blue": "0 0 20px rgba(77, 142, 250, 0.15)",
        "glow-green": "0 0 20px rgba(52, 211, 153, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
