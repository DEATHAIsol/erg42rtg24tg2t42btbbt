/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties so the whole system can switch theme.
        terminal: {
          bg: 'rgb(var(--c-bg) / <alpha-value>)',
          surface: 'rgb(var(--c-surface) / <alpha-value>)',
          elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
          border: 'rgb(var(--c-border) / <alpha-value>)',
          'border-strong': 'rgb(var(--c-border-strong) / <alpha-value>)',
          accent: 'rgb(var(--c-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--c-accent-hover) / <alpha-value>)',
          ink: 'rgb(var(--c-ink) / <alpha-value>)',
          success: 'rgb(var(--c-success) / <alpha-value>)',
          danger: 'rgb(var(--c-danger) / <alpha-value>)',
          warning: 'rgb(var(--c-warning) / <alpha-value>)',
          text: {
            primary: 'rgb(var(--c-text-primary) / <alpha-value>)',
            secondary: 'rgb(var(--c-text-secondary) / <alpha-value>)',
            muted: 'rgb(var(--c-text-muted) / <alpha-value>)',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '10px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        'card-hover': '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 16px 40px -16px rgba(0,0,0,0.7)',
        modal: '0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 80px -24px rgba(0,0,0,0.85)',
        'glow-accent': '0 0 28px -8px rgba(255,125,90,0.5)',
        'glow-success': '0 0 24px -8px rgba(47,212,140,0.4)',
        'glow-danger': '0 0 24px -8px rgba(246,70,93,0.4)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(0,-18px,0) scale(1.04)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left': 'slide-in-left 0.25s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        drift: 'drift 10s ease-in-out infinite',
        marquee: 'marquee 60s linear infinite',
      },
    },
  },
  plugins: [],
}
