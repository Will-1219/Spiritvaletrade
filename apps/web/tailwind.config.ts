import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0f14',
        panel: '#151922',
        line: '#242b38',
        dim: '#8b93a5',
        accent: '#63d0a4',
        gold: '#e3b34c',
      },
    },
  },
  plugins: [],
} satisfies Config;
