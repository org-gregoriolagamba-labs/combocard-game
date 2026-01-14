import { VALORI_NUM } from './constants.js';
import { cartaEsisteInCartella } from './cardUtils.js';

export function trovaMiglioreConversioneJolly(cartella, coperte, jollyPos, tipo) {
  if (!jollyPos) return null;
  
  const jollyCard = cartella[jollyPos.row][jollyPos.col];
  
  const covered = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c] && !(r === jollyPos.row && c === jollyPos.col)) {
        covered.push(cartella[r][c]);
      }
    }
  }
  
  // LOGICA: Non richiedono stesso seme -> Cambia VALORE, Mantieni SEME
  if (tipo === 'tris') {
    const counts = {};
    covered.forEach(c => counts[c.valore] = (counts[c.valore] || 0) + 1);
    
    for (let valore in counts) {
      if (counts[valore] >= 2) {
        if (!cartaEsisteInCartella(cartella, jollyPos, valore, jollyCard.seme)) {
          return { valore: valore, seme: jollyCard.seme };
        }
      }
    }
  } 
  else if (tipo === 'sequenza') {
    const nums = [...new Set(covered.map(c => c.valoreNum))].sort((a, b) => a - b);
    
    for (let start = 1; start <= 10 - 4 + 1; start++) {
      let missing = [];
      let present = [];
      for (let v = start; v < start + 4; v++) {
        if (nums.includes(v)) present.push(v);
        else missing.push(v);
      }
      
      if (missing.length === 1 && present.length === 3) {
        const missingNum = missing[0];
        const missingValore = Object.keys(VALORI_NUM).find(k => VALORI_NUM[k] === missingNum);
        
        if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, jollyCard.seme)) {
          return { valore: missingValore, seme: jollyCard.seme };
        }
      }
    }
  } 
  else if (tipo === 'napola') {
    const values = {};
    covered.forEach(c => values[c.valore] = (values[c.valore] || 0) + 1);
    const counts = Object.entries(values).sort((a, b) => b[1] - a[1]);
    
    if (counts.length >= 2 && counts[0][1] === 2 && counts[1][1] >= 2) {
      const valoreTarget = counts[0][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valoreTarget, jollyCard.seme)) {
        return { valore: valoreTarget, seme: jollyCard.seme };
      }
    }
    if (counts.length >= 2 && counts[0][1] >= 3 && counts[1][1] === 1) {
      const valoreTarget = counts[1][0];
      if (!cartaEsisteInCartella(cartella, jollyPos, valoreTarget, jollyCard.seme)) {
        return { valore: valoreTarget, seme: jollyCard.seme };
      }
    }
  }
  
  // LOGICA: Richiedono stesso seme -> Cambia SEME, Mantieni VALORE
  else if (tipo === 'scopa') {
    const semiCounts = {};
    covered.forEach(c => semiCounts[c.seme] = (semiCounts[c.seme] || 0) + 1);
    
    let bestSeme = null;
    let maxCount = 0;
    for (let s in semiCounts) {
      if (semiCounts[s] > maxCount) {
        maxCount = semiCounts[s];
        bestSeme = s;
      }
    }

    if (bestSeme && maxCount >= 4) {
      if (!cartaEsisteInCartella(cartella, jollyPos, jollyCard.valore, bestSeme)) {
        return { valore: jollyCard.valore, seme: bestSeme };
      }
    }
  }
  
  // LOGICA SPECIALE: Combocard Reale
  else if (tipo === 'combocard_reale') {
    const perSeme = {};
    covered.forEach(c => {
      perSeme[c.seme] = perSeme[c.seme] || [];
      perSeme[c.seme].push(c.valoreNum);
    });

    for (let seme in perSeme) {
      const nums = [...new Set(perSeme[seme])].sort((a, b) => a - b);
      
      for (let start = 1; start <= 10 - 4 + 1; start++) {
        let missing = [];
        let present = [];
        for (let v = start; v < start + 4; v++) {
          if (nums.includes(v)) present.push(v);
          else missing.push(v);
        }
        
        if (missing.length === 1 && present.length === 3) {
          const missingNum = missing[0];
          const missingValore = Object.keys(VALORI_NUM).find(k => VALORI_NUM[k] === missingNum);
          
          if (!cartaEsisteInCartella(cartella, jollyPos, missingValore, seme)) {
            return { valore: missingValore, seme: seme };
          }
        }
      }
    }
  }
  
  return null;
}