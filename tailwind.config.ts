import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          elevated: 'var(--surface-elevated)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          hover: 'var(--gold-hover)',
          soft: 'var(--gold-soft)',
        },
        'on-gold': 'var(--on-gold)',
        foreground: 'var(--foreground)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        'token-sm': 'var(--shadow-sm)',
        'token-md': 'var(--shadow-md)',
        'token-lg': 'var(--shadow-lg)',
        gold: '0 4px 20px rgba(212, 175, 55, 0.15)',
        'gold-lg': '0 8px 30px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
