/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          bg: '#000000',
          surface: '#0a0a0a',
          raised: '#141414',
          border: '#222222',
          muted: '#888888',
          text: '#f2f2ef',
        },
        accent: {
          orange: '#ff5a1f',
          orangeMuted: '#8a3a1a',
        },
        rating: {
          blackout: '#e05a5a',
          hard: '#e0a84c',
          good: '#4fbf82',
          easy: '#5b93e0',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['"Silkscreen"', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
