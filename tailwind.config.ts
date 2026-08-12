import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep indigo ink — headings, dark panels, primary surfaces.
        navy: {
          50: "#f5f5fa",
          100: "#e8e8f1",
          200: "#cdcddf",
          300: "#a6a6c4",
          400: "#7373a0",
          500: "#4f4f80",
          600: "#383864",
          700: "#26264c",
          800: "#17173a",
          900: "#0f1035",
          950: "#08081f",
        },
        // Golden amber — the signature accent used on every primary action.
        brand: {
          50: "#fff9eb",
          100: "#fef0c7",
          200: "#fde08a",
          300: "#fbcb4d",
          400: "#f8b324",
          500: "#f5a623",
          600: "#db8b0a",
          700: "#b06e0c",
          800: "#8a570f",
          900: "#714710",
        },
        // Warm cream — page background and quiet surfaces. Never pure white.
        cream: {
          50: "#fdfdfb",
          100: "#faf9f5",
          200: "#f4f2ea",
          300: "#eae7db",
          400: "#d9d5c4",
        },
        // Warm gold used sparingly for ratings and soft highlight tiles.
        accent: {
          50: "#fff8ed",
          100: "#ffeecc",
          200: "#ffdd9e",
          300: "#fcc95f",
          400: "#f5b942",
          500: "#e8a127",
          600: "#c8830f",
          700: "#a06a10",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15, 16, 53, 0.04), 0 8px 24px -14px rgba(15, 16, 53, 0.10)",
        card: "0 2px 8px rgba(15, 16, 53, 0.04), 0 24px 56px -28px rgba(15, 16, 53, 0.18)",
        glow: "0 10px 28px -10px rgba(245, 166, 35, 0.55)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        "4xl": "2.25rem",
      },
      backgroundImage: {
        "grid-navy":
          "radial-gradient(circle at 1px 1px, rgba(15,16,53,0.10) 1px, transparent 0)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 26s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
