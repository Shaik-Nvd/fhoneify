import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: {
          DEFAULT: '#111111',
          elevated: '#1a1a1a',
        },
        gold: {
          DEFAULT: '#d4af37',
          hover: '#f0c040',
        },
        foreground: '#ffffff',
        muted: '#a0a0a0',
        border: '#2a2a2a',
        success: '#34C759',
        warning: '#FF9500',
        danger: '#FF3B30',
      },
      boxShadow: {
        gold: '0 4px 20px rgba(212, 175, 55, 0.15)',
        'gold-lg': '0 8px 30px rgba(212, 175, 55, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
