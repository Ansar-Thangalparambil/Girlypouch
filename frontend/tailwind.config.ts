import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF8F7',  // Clean alabaster cream
          100: '#FAF0ED', // Warm peach tint
          200: '#F5D3CF', // Soft petal pink
          300: '#EBADAB', // Pastel rose-gold
          400: '#DE9C96', // Mid-tone dusty rose
          500: '#CB5857', // Accent terracotta coral
          600: '#B83C3E', // Rich deep coral
          700: '#9A2F32', // Vibrant crimson
          800: '#691D24', // Deep wine red
          900: '#4D1217', // Dark black-cherry
          dark: '#1C1616', // Deep charcoal
          card: '#FAF9F8',
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
