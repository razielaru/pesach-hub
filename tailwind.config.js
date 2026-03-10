/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { heebo: ['Heebo', 'sans-serif'] },
      colors: {
        bg0: '#08090e', bg1: '#0f1117', bg2: '#161922',
        bg3: '#1e222e', bg4: '#252a38',
        border1: '#2a2f42', border2: '#363c55',
        gold: '#d4a520', gold2: '#f0c040',
        text1: '#e0e4f0', text2: '#9aa0be', text3: '#5a6080',
      }
    }
  },
  plugins: []
}
