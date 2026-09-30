/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)'
      },
      colors: {
        background: 'rgb(var(--color-bg))',
        surface: 'rgb(var(--color-surface))',
        primary: 'rgb(var(--color-primary))',
        border: 'rgb(var(--color-border))',
        error: 'rgb(var(--color-error))',
        success: 'rgb(var(--color-success))',
      },
      boxShadow: {
        'precise': '4px 4px 0px 0px rgba(15, 20, 25, 1)', 
        'subtle': '2px 2px 0px 0px rgba(15, 20, 25, 0.2)'
      }
    },
  },
  plugins: [],
}
