// Palette of the game: the inks of the 1875 Neapolitan deck on the card stock of a tombola sheet.
// The table is a deep cobalt, the sheet is straw-coloured card, the ink is a warm brown-black.
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        // Table (page ground)
        notte: { 950: '#0b1236', 900: '#101a4a', 800: '#16236a', 700: '#233792', 300: '#aeb9ee' },
        // Straw card stock of the sheet
        cartone: { 50: '#fffaf0', 100: '#fbf0cd', 200: '#f3dc8f', 300: '#e6c460', 400: '#c9a235' },
        // Printing ink
        inchiostro: { 900: '#2a1a0f', 700: '#4d3522', 500: '#7a5b3f' },
        // The four suits, each with its own ink
        denari: { DEFAULT: '#8f6200', soft: '#f5d98a' },
        coppe: { DEFAULT: '#b92d1b', soft: '#f3b9ad' },
        spade: { DEFAULT: '#1f3a99', soft: '#b9c5f2' },
        bastoni: { DEFAULT: '#236a3a', soft: '#b5dcc0' },
        // The bean that covers a drawn card, and the action colour
        fagiolo: { DEFAULT: '#b92d1b', dark: '#8f1f12' },
        ocra: { DEFAULT: '#f2b632', dark: '#c98f0c' },
      },
      fontFamily: {
        display: ['"Alfa Slab One"', 'Rockwell', 'Georgia', 'serif'],
      },
      boxShadow: {
        foglio: '0 14px 28px -12px rgba(5, 8, 30, 0.7), 0 2px 0 rgba(255, 255, 255, 0.08) inset',
        pulsante: '0 3px 0 rgba(42, 26, 15, 0.9)',
      },
      keyframes: {
        'fagiolo-giu': {
          '0%': { transform: 'translateY(-10px) scale(1.25)', opacity: '0' },
          '60%': { transform: 'translateY(1px) scale(0.95)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        estrai: {
          '0%': { transform: 'translateY(-12px) rotate(-6deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        conta: {
          '0%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fagiolo-giu': 'fagiolo-giu 380ms cubic-bezier(0.22, 1, 0.36, 1) both',
        estrai: 'estrai 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        conta: 'conta 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
