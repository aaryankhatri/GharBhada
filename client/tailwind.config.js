/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        primaryDark: '#1E40AF',
        accent: '#F59E0B',
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)',
      },
      fontFamily: {
        sans: ['Mukta', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
