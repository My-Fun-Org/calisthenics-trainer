import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: {
          DEFAULT: "#e07a4a",
          bright: "#f0945a",
          deep: "#c45f32",
        },
        clay: {
          50: "#f6efe8",
          100: "#ead9c8",
          800: "#2a211c",
          900: "#1c1512",
          950: "#120e0c",
        },
        sage: {
          DEFAULT: "#7d9b76",
          bright: "#97b58f",
        },
      },
      fontFamily: {
        display: ["'Outfit'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lift: "0 18px 40px rgba(0,0,0,0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.28s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
