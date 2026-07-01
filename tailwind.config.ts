import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — orange (matching the QTC JV / Bouygues lockup)
        brand: {
          DEFAULT: "#F15A22",
          dark: "#C2410C",
          soft: "#FFF1EA",
          ring: "#FBA877",
        },
        // Light surfaces
        page: "#F4F5F7",
        surface: "#FFFFFF",
        line: "#E6E8EC",
        ink: {
          900: "#0F172A",
          700: "#334155",
          500: "#64748B",
          400: "#94A3B8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
