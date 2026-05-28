/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        serif:   ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Hanken Grotesk', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Stitch Design System Colors
        primary: {
          DEFAULT: '#004ac6',
          container: '#2563eb',
          fixed: '#dbe1ff',
          'fixed-dim': '#b4c5ff',
        },
        'on-primary': '#ffffff',
        'primary-container': '#2563eb',
        secondary: {
          DEFAULT: '#4b41e1',
          container: '#645efb',
          fixed: '#e2dfff',
        },
        'on-secondary': '#ffffff',
        tertiary: {
          DEFAULT: '#006058',
          container: '#007b71',
          fixed: '#89f5e7',
        },
        'on-tertiary': '#ffffff',
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#ccdbf3',
          bright: '#f8f9ff',
          variant: '#d5e3fc',
          container: {
            lowest: '#ffffff',
            low: '#eff4ff',
            DEFAULT: '#e6eeff',
            high: '#dce9ff',
            highest: '#d5e3fc',
          },
        },
        'on-surface': '#0d1c2e',
        'on-surface-variant': '#434655',
        outline: {
          DEFAULT: '#737686',
          variant: '#c3c6d7',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': '#ffffff',
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      spacing: {
        sidebar: '260px',
        'sidebar-collapsed': '72px',
        gutter: '24px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'shimmer':    'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'glass':   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card':    '0 4px 16px rgba(37,99,235,0.08)',
        'glow-sm': '0 0 16px rgba(37,99,235,0.2)',
        'glow-md': '0 0 32px rgba(37,99,235,0.3)',
      },
    },
  },
  plugins: [],
}
