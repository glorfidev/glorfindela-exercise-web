import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#DFF7F0',
          100: '#DFF7F0',
          200: '#6EE7C6',
          300: '#6EE7C6',
          400: '#1FA88A',
          500: '#1FA88A',
          600: '#0B2F30',
        },
        ink: '#0B2F30',
        muted: '#A1A7AA',
        lilac: '#d8d2ff',
        skysoft: '#d9efff',
        paper: '#DFF7F0',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(11, 47, 48, 0.12)',
        card: '0 10px 30px rgba(11, 47, 48, 0.10)',
      },
      borderRadius: {
        '2xl': '1.35rem',
        '3xl': '1.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
