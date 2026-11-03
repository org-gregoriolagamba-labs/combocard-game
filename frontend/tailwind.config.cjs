// Palette of the game: a dark, calm table on which the cards are the light.
// The four suits keep the inks of the 1875 deck, made luminous for a dark ground.
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        // The table (page ground) and the surfaces that sit on it
        notte: { 950: '#070b1f', 900: '#0b1130', 800: '#0f1737', 700: '#18224d', 600: '#232f66' },
        // Hairlines
        linea: { DEFAULT: '#2a356b', forte: '#4a5aa6' },
        // Text on the table
        testo: { DEFAULT: '#f4f1ea', 2: '#b7bfdc', 3: '#8b94bb' },
        // The card: the only light object
        carta: { DEFAULT: '#f7f1e1', 2: '#e9dfc4' },
        // The four suits, luminous
        denari: { DEFAULT: '#ffcf4a', soft: 'rgba(255, 207, 74, 0.16)' },
        coppe: { DEFAULT: '#ff6a55', soft: 'rgba(255, 106, 85, 0.16)' },
        spade: { DEFAULT: '#6f97ff', soft: 'rgba(111, 151, 255, 0.18)' },
        bastoni: { DEFAULT: '#3ddc97', soft: 'rgba(61, 220, 151, 0.16)' },
        // Action and prize
        oro: { DEFAULT: '#ffcf4a', dark: '#e6b52e' },
        inchiostro: { 900: '#1a1208' },
        // Error / destructive
        errore: { DEFAULT: '#ff6a55', dark: '#e0503c' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Depth: a soft shadow and a light on the top edge
        superficie: '0 18px 40px -18px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        carta: '0 10px 24px -8px rgba(0, 0, 0, 0.7)',
        alone: '0 0 0 1px rgba(255, 255, 255, 0.08), 0 8px 30px -6px var(--alone, rgba(255, 207, 74, 0.45))',
      },
      keyframes: {
        sigillo: {
          '0%': { transform: 'scale(0.2)', opacity: '0' },
          '55%': { transform: 'scale(1.18)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        onda: {
          '0%': { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        estrai: {
          '0%': { transform: 'translateY(-12px) rotate(-6deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        conta: {
          '0%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        rivela: {
          '0%': { transform: 'perspective(900px) rotateY(95deg) scale(0.6)', opacity: '0' },
          '28%': { transform: 'perspective(900px) rotateY(-8deg) scale(1.04)', opacity: '1' },
          '40%': { transform: 'perspective(900px) rotateY(0) scale(1)', opacity: '1' },
          '82%': { transform: 'perspective(900px) rotateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'perspective(900px) rotateY(0) scale(0.55) translateY(-46vh)', opacity: '0' },
        },
        velo: {
          '0%': { opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        coriandolo: {
          '0%': { transform: 'translate(0, 0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) rotate(var(--rot))', opacity: '0' },
        },
      },
      animation: {
        sigillo: 'sigillo 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        onda: 'onda 700ms ease-out both',
        estrai: 'estrai 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        conta: 'conta 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
        rivela: 'rivela 1700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        velo: 'velo 1700ms ease-out both',
        coriandolo: 'coriandolo 1400ms cubic-bezier(0.2, 0.8, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
