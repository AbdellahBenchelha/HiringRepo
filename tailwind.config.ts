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
        // Modern SaaS palette: deep navy ink + vibrant teal brand + warm coral accent.
        navy: {
          50: "#eef2f9",
          100: "#dce4f2",
          200: "#b7c6e2",
          300: "#8aa0cb",
          400: "#5b76ab",
          500: "#3a548c",
          600: "#2b3f6e",
          700: "#213257",
          800: "#16223d",
          900: "#0c1526",
          950: "#070d18",
        },
        // Teal/aqua — the signature brand accent.
        brand: {
          50: "#effcf9",
          100: "#c9f5ec",
          200: "#98ecdc",
          300: "#5eddc7",
          400: "#2dc6ae",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
        // Warm coral — used sparingly for emphasis (badges, highlights).
        accent: {
          50: "#fff5f1",
          100: "#ffe6db",
          200: "#ffc7b2",
          300: "#ffa183",
          400: "#ff7a52",
          500: "#f85a2c",
          600: "#e2451c",
          700: "#bc3518",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(12, 21, 38, 0.10)",
        card: "0 18px 48px -20px rgba(12, 21, 38, 0.28)",
        glow: "0 16px 50px -12px rgba(20, 184, 166, 0.45)",
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      backgroundImage: {
        "grid-navy":
          "radial-gradient(circle at 1px 1px, rgba(58,84,140,0.16) 1px, transparent 0)",
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
