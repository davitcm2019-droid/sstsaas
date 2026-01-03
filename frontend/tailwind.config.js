/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#8FFC45', // Verde principal
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#365314',
          900: '#1a2e05',
        }
      }
    },
  },
  plugins: [],
}
