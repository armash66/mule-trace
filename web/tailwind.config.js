/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      paper: 'var(--paper)',
      paper2: 'var(--paper-2)',
      ink: 'var(--ink)',
      ink2: 'var(--ink-2)',
      rule: 'var(--rule)',
      signal: 'var(--signal)',
      ok: 'var(--ok)',
      transparent: 'transparent',
      current: 'currentColor',
    },
    extend: {
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
