/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@digitalcanopy/ui/tailwind.preset')],
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/app/**/*.{js,ts,jsx,tsx}',
    '../../node_modules/@digitalcanopy/ui/**/*.{js,ts,jsx,tsx}',
    './node_modules/@digitalcanopy/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
