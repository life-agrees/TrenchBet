/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Base colors
          'dark': {
            950: '#0a0e12',
            900: '#0f1419',
            800: '#16181d',
            700: '#1f2228',
            600: '#2a2d35',
          },
          // Primary - Electric Lime/Chartreuse
          'primary': {
            DEFAULT: '#CDFF00',
            50: '#f7ffe6',
            100: '#e8ffc0',
            200: '#d4ff85',
            300: '#CDFF00',
            400: '#b8e600',
            500: '#9acc00',
            600: '#7aa300',
            700: '#5c7a00',
          },
          // Secondary - Amber/Gold
          'secondary': {
            DEFAULT: '#FFB800',
            50: '#fff9e6',
            100: '#fff0c2',
            200: '#ffe188',
            300: '#ffd24d',
            400: '#FFB800',
            500: '#e6a500',
            600: '#cc9200',
            700: '#996d00',
          },
          // Success (for "Yes" predictions)
          'success': {
            DEFAULT: '#00FF88',
            light: '#66ffb3',
            dark: '#00cc6e',
          },
          // Danger (for "No" predictions)
          'danger': {
            DEFAULT: '#FF4757',
            light: '#ff7585',
            dark: '#e6303f',
          },
          // Neutrals
          'neutral': {
            50: '#f8f9fa',
            100: '#e9ecef',
            200: '#dee2e6',
            300: '#ced4da',
            400: '#adb5bd',
            500: '#6c757d',
            600: '#495057',
            700: '#343a40',
            800: '#212529',
            900: '#16181d',
          }
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'fade-in': 'fade-in 0.3s ease-in',
          'scale-in': 'scale-in 0.3s ease-out',
        },
        backdropBlur: {
          xs: '2px',
        },
        fontFamily: {
          sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
          mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
        },
        keyframes: {
          'slide-in-from-top-4': {
            '0%': { opacity: '0', transform: 'translateY(-16px)' },
            '100%': { opacity: '1', transform: 'translateY(0)' }
          },
          'fade-out': {
            '0%': { opacity: '1' },
            '100%': { opacity: '0' }
          }
        },
        backdropBlur: {
          xs: '2px',
        }
      },
    },
    plugins: [],
  }