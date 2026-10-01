/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#fbf7ee',
          yellow: '#fde047',
          coral: '#ff6b6b',
          teal: '#4ecdc4',
          purple: '#a78bfa',
          pink: '#ffa8a8',
          peach: '#ffbe76',
          green: '#51cf66',
          blue: '#339af0',
          dark: '#000000',
        },
        neuro: {
          dark: '#0a0d14',
          card: '#121824',
          cardBorder: '#1e293b',
          cyan: '#06b6d4',
          neonPurple: '#8b5cf6',
          neonPink: '#ec4899',
          neonGreen: '#10b981',
          neonAmber: '#f59e0b',
        }
      },
      boxShadow: {
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '3px 3px 0px 0px #000000',
        'neo-md': '4px 4px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.2))' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
