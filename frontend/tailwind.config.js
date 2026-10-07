/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'dream-purple': '#D95338',
        'dream-indigo': '#DE6B48',
        'dream-dark': '#FAF7F2',
        'dream-card': '#FFFDF9',
        'dream-border': '#E8AEA0',
        'editorial-bg': '#FAF7F2',
        'editorial-surface': '#FFFDF9',
        'editorial-coral': '#DE6B48',
        'editorial-terracotta': '#D95338',
        'editorial-teal': '#3A8898',
        'editorial-ink': '#1F2421',
        'editorial-charcoal': '#2D3142',
        'editorial-muted': '#78716C',
        'editorial-light': '#F5EFE6',
        'editorial-border': '#E8AEA0',
      }
    },
  },
  plugins: [],
}
