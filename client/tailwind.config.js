/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#172033', canvas: '#F8FAFC', brand: '#e11d48' },
      boxShadow: { glow: '0 24px 80px -28px rgba(225, 29, 72, 0.38)' },
      animation: { 'fade-up': 'fade-up .5s ease-out both' },
      keyframes: { 'fade-up': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } } }
    }
  },
  plugins: []
}
