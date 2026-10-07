/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dream-purple': '#ff8c00',
        'dream-indigo': '#ea580c',
        'dream-dark': '#08090a',
        'dream-card': '#111214',
        'dream-border': '#28292d',
      }
    },
  },
  plugins: [],
}
