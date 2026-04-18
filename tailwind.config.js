/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          // Base colors - updated for purely neutral blacks (Polymarket style)
          'dark': {
            950: '#000000',
            900: '#111111',
            800: '#18181A',
            700: '#27272A',
            600: '#3F3F46',
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
        textColor: {
          'primary': {
            DEFAULT: 'rgb(var(--color-primary-text) / <alpha-value>)',
          },
          'success': {
            DEFAULT: 'rgb(var(--color-success-text) / <alpha-value>)',
          },
          'danger': {
            DEFAULT: 'rgb(var(--color-danger-text) / <alpha-value>)',
          }
        },
        borderColor: {
          'primary': {
            DEFAULT: 'rgb(var(--color-primary-text) / <alpha-value>)',
          },
          'success': {
            DEFAULT: 'rgb(var(--color-success-text) / <alpha-value>)',
          },
          'danger': {
            DEFAULT: 'rgb(var(--color-danger-text) / <alpha-value>)',
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
          sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
          mono: ['Roboto Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
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
        }
      },
    },
    plugins: [
      function({ addUtilities }) {
        addUtilities({
          '.scrollbar-thin': {
            'scrollbar-width': 'thin',
          },
          '.scrollbar-thin::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '.scrollbar-thin::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '.scrollbar-thin::-webkit-scrollbar-thumb': {
            background: 'rgba(107, 114, 128, 0.5)',
            'border-radius': '3px',
          },
          '.scrollbar-thin::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(107, 114, 128, 0.7)',
          },
          '.scrollbar-track-dark-900': {
            '&::-webkit-scrollbar-track': {
              background: 'rgba(15, 20, 25, 0.8)',
            },
          },
        });
      },
    ],
  }
