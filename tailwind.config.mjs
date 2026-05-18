/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Geological palette: dark crust + igneous accent
        crust: {
          950: "#0b0d10",
          900: "#11141a",
          800: "#1a1f29",
          700: "#252b38",
          600: "#36404f",
          500: "#4f5b6e",
          400: "#7c8597",
          300: "#a5acbb",
          200: "#cdd1da",
          100: "#e9ebef",
        },
        magma: {
          // Igneous accent — amber-into-orange
          500: "#f59e0b",
          600: "#d97706",
          400: "#fbbf24",
          300: "#fcd34d",
        },
        crystal: {
          // Emerald — used sparingly for "verifiable" emphasis
          500: "#34d399",
          600: "#10b981",
          400: "#6ee7b7",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
