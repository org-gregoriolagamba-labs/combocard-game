import { SEMI, SEMI_EMOJI, VALORI, VALORI_NUM } from './constants.js';

export function generaMazzo() {
  const mazzo = [];
  for (let seme of SEMI) {
    for (let valore of VALORI) {
      mazzo.push({ 
        valore, 
        seme, 
        emoji: SEMI_EMOJI[seme],
        valoreNum: VALORI_NUM[valore]
      });
    }
  }
  return mazzo;
}

export function generaCartella() {
  const mazzoCompleto = generaMazzo();
  const mazzoMescolato = mazzoCompleto.sort(() => Math.random() - 0.5);
  const carte25 = mazzoMescolato.slice(0, 25);
  
  const cartella = Array(5).fill(null).map(() => Array(5).fill(null));
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      cartella[r][c] = { ...carte25[idx] };
      idx++;
    }
  }
  
  return cartella;
}

export function cartaEsisteInCartella(cartella, jollyPos, valore, seme) {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (jollyPos && jollyPos.row === r && jollyPos.col === c) continue;
      
      const carta = cartella[r][c];
      if (carta.valore === valore && carta.seme === seme) {
        return true;
      }
    }
  }
  return false;
}