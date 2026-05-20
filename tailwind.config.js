/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 18px 45px rgba(31, 41, 55, 0.12)',
        pixel: '0 8px 0 rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
