import type { Config } from "tailwindcss";

// Paleta institucional Invest in Bogotá.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "iib-primary": "#C00000",
        "iib-primary-hover": "#A30000",
        "iib-background": "#F7F5F2",
        "iib-surface": "#FFFFFF",
        "iib-surface-sunken": "#EFECE6",
        "iib-foreground": "#262626",
        "iib-secondary": "#6B6B6B",
        "iib-border": "#E4E0D8",
        // Semáforo de avance. Deliberadamente distinto del rojo institucional
        // para que "atrasado" nunca se confunda con la marca.
        success: { DEFAULT: "#3F8F5F", bg: "#E8F3EC" },
        warning: { DEFAULT: "#C67C1E", bg: "#FAF0DD" },
        danger: { DEFAULT: "#A6291D", bg: "#F7E7E5" },
      },
      fontFamily: {
        sans: [
          "Segoe UI",
          "-apple-system",
          "BlinkMacSystemFont",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "0.75rem",
      },
      boxShadow: {
        card: "0 2px 10px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
