import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },

    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        "trust-verified": {
          DEFAULT: "var(--trust-verified)",
          foreground: "var(--trust-verified-foreground)",
        },
        "trust-checked": {
          DEFAULT: "var(--trust-checked)",
          foreground: "var(--trust-checked-foreground)",
        },
        "trust-bound": {
          DEFAULT: "var(--trust-bound)",
          foreground: "var(--trust-bound-foreground)",
        },
        "trust-pending": {
          DEFAULT: "var(--trust-pending)",
          foreground: "var(--trust-pending-foreground)",
        },
        "verify-basic": {
          DEFAULT: "var(--verify-basic)",
          foreground: "var(--verify-basic-foreground)",
        },
        "verify-confirmed": {
          DEFAULT: "var(--verify-confirmed)",
          foreground: "var(--verify-confirmed-foreground)",
        },
        "verify-guaranteed": {
          DEFAULT: "var(--verify-guaranteed)",
          foreground: "var(--verify-guaranteed-foreground)",
        },
        "tier-bronze": {
          DEFAULT: "var(--tier-bronze)",
          foreground: "var(--tier-bronze-foreground)",
        },
        "tier-silver": {
          DEFAULT: "var(--tier-silver)",
          foreground: "var(--tier-silver-foreground)",
        },
        "tier-gold": {
          DEFAULT: "var(--tier-gold)",
          foreground: "var(--tier-gold-foreground)",
        },
        "tier-platinum": {
          DEFAULT: "var(--tier-platinum)",
          foreground: "var(--tier-platinum-foreground)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        "2xs": "var(--shadow-2xs)",
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        subtle: "var(--shadow-subtle)",
        elevated: "var(--shadow-elevated)",
        trust: "var(--shadow-trust)",
        tier: "var(--shadow-tier)",
      },
      keyframes: {
        "page-transition": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "badge-pop": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "page-transition": "page-transition 0.4s cubic-bezier(0.4,0,0.2,1) both",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.4,0,0.2,1) both",
        "badge-pop": "badge-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
