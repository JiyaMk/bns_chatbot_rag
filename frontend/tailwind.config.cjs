/** @type {import('tailwindcss').Config} */
module.exports = {
darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/ui/**/*.{js,ts,jsx,tsx}", // for shadcn
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        destructive: "var(--destructive)",
        input: "var(--input)",
        border: "var(--border)",
        ring: "var(--ring)"
      }
    },
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
