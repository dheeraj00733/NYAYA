/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nyaya: {
          dark: '#0B192C',
          navy: '#1E293B',
          slate: '#334155',
          muted: '#64748B',
          light: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          accent: '#1E40AF',
          primary: '#2563EB',
          hover: '#1D4ED8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
