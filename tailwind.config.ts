import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#00F0FF',
          600: '#00CFE3',
        }
      }
    },
  },
  plugins: [],
} satisfies Config
