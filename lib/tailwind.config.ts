import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#F7F8FA",
          surface: "#FFFFFF",
          border: "#E4E7EC",
        },
        ink: {
          DEFAULT: "#1C1F26",
          soft: "#5B6270",
          faint: "#9098A6",
        },
        brand: {
          sidebar: "#14213D",
          sidebarSoft: "#1E2C4F",
          accent: "#2E6F5E",
          accentSoft: "#E4F0EC",
        },
        signal: {
          positive: "#2E6F5E",
          negative: "#B3402A",
          warning: "#B3841F",
          negativeSoft: "#F7E9E5",
          positiveSoft: "#E4F0EC",
          warningSoft: "#F7EFDF",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
