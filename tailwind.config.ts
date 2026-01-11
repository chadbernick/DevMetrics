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
        // Dark theme colors (from inspiration.png)
        dark: {
          bg: {
            primary: "#1a1a2e",
            secondary: "#16213e",
            tertiary: "#0f0f1a",
            card: "#1e1e3f",
            elevated: "#252550",
          },
          border: "#2a2a4a",
        },
        // Light theme colors (from light.png)
        light: {
          bg: {
            primary: "#ffffff",
            secondary: "#f8fafc",
            tertiary: "#f1f5f9",
          },
          border: "#e2e8f0",
        },
        // Accent colors
        accent: {
          cyan: "#00d4ff",
          "cyan-dark": "#0891b2",
          purple: "#8b5cf6",
          "purple-dark": "#7c3aed",
          pink: "#ec4899",
          green: "#10b981",
          yellow: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
