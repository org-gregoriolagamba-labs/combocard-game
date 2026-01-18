/**
 * Progress Calculation Utilities
 * 
 * Calculates progress towards different collection types.
 */

export function calcolaProgresso(currentPlayer, tipo) {
  if (!currentPlayer) return { count: 0, total: 0, status: "far" };

  const totali = {
    tris: 3,
    sequenza: 4,
    scopa: 5,
    napola: 5,
    combocard_reale: 4,
  };

  const total = totali[tipo] || 0;

  const covered = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (currentPlayer.coperte[r][c]) {
        covered.push(currentPlayer.cartella[r][c]);
      }
    }
  }

  let count = 0;

  if (tipo === "tris") {
    const counts = {};
    covered.forEach((c) => {
      counts[c.valore] = (counts[c.valore] || 0) + 1;
    });
    const max = Object.values(counts).length
      ? Math.max(...Object.values(counts))
      : 0;
    count = Math.min(max, total);
  } else if (tipo === "sequenza") {
    const nums = [...new Set(covered.map((c) => c.valoreNum))].sort(
      (a, b) => a - b
    );
    let best = 0,
      cur = 0,
      prev = null;
    nums.forEach((n) => {
      if (prev === null || n !== prev + 1) cur = 1;
      else cur++;
      prev = n;
      if (cur > best) best = cur;
    });
    count = Math.min(best, total);
  } else if (tipo === "scopa") {
    const suits = {};
    covered.forEach((c) => (suits[c.seme] = (suits[c.seme] || 0) + 1));
    const max = Object.values(suits).length
      ? Math.max(...Object.values(suits))
      : 0;
    count = Math.min(max, total);
  } else if (tipo === "napola") {
    const values = {};
    covered.forEach((c) => {
      values[c.valore] = (values[c.valore] || 0) + 1;
    });
    const counts = Object.values(values).sort((a, b) => b - a);
    if (counts.length >= 2) {
      if (counts[0] >= 3 && counts[1] >= 2) {
        count = 5;
      } else {
        const countTris = Math.min(counts[0], 3);
        const countCoppia = Math.min(counts[1], 2);
        count = countTris + countCoppia;
      }
    } else if (counts.length === 1) {
      count = Math.min(counts[0], 3);
    }
    count = Math.min(count, total);
  } else if (tipo === "combocard_reale") {
    const perSeme = {};
    covered.forEach((c) => {
      perSeme[c.seme] = perSeme[c.seme] || [];
      perSeme[c.seme].push(c.valoreNum);
    });

    let best = 0;
    for (const s in perSeme) {
      const nums = [...new Set(perSeme[s])].sort((a, b) => a - b);
      let curBest = 0,
        cur = 0,
        prev = null;
      nums.forEach((n) => {
        if (prev === null || n !== prev + 1) cur = 1;
        else cur++;
        prev = n;
        if (cur > curBest) curBest = cur;
      });
      if (curBest > best) best = curBest;
    }
    count = Math.min(best, total);
  }

  const missing = total - count;
  let status = "far";
  if (missing <= 2 && missing > 0) status = "near";
  else if (count >= Math.ceil(total / 2)) status = "mid";

  return { count, total, status };
}

export default {
  calcolaProgresso,
};
