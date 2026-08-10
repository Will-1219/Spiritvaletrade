import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f7f5f0',        // warm ivory paper
        panel: '#ffffff',
        line: '#e6e1d6',      // warm hairline
        ink: '#211e19',       // near-black warm ink
        dim: '#82796a',       // warm gray
        accent: '#20725b',    // deep jade — 靈谷
        accentsoft: '#eaf3ee',
        gold: '#a06b1f',      // readable amber
        goldsoft: '#f7efe0',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei',
          'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        display: ['Noto Serif TC', 'Songti TC', 'STSong', 'PMingLiU', 'Noto Serif SC', 'SimSun',
          'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(30,25,15,0.04), 0 4px 16px rgba(30,25,15,0.05)',
        lift: '0 2px 4px rgba(30,25,15,0.06), 0 10px 28px rgba(30,25,15,0.09)',
      },
    },
  },
  plugins: [],
} satisfies Config;
