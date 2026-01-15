// Verifica TRIS (3 carte stesso valore)
export function verificaTris(cartella, coperte) {
  const valoriCoperti = {};

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }

  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) return true;
  }

  return false;
}

// Verifica SEQUENZA (4 carte in fila, semi misti OK)
export function verificaSequenza(cartella, coperte) {
  const valoriCoperti = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        valoriCoperti.push(cartella[r][c].valoreNum);
      }
    }
  }

  const valoriUnici = [...new Set(valoriCoperti)].sort((a, b) => a - b);
  const needed = 4;

  for (let i = 0; i <= valoriUnici.length - needed; i++) {
    let ok = true;
    for (let k = 1; k < needed; k++) {
      if (valoriUnici[i + k] !== valoriUnici[i] + k) { 
        ok = false; 
        break; 
      }
    }
    if (ok) return true;
  }

  return false;
}

// Verifica SCOPA (5 carte stesso seme)
export function verificaScopa(cartella, coperte) {
  const semiCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const seme = cartella[r][c].seme;
        semiCoperti[seme] = (semiCoperti[seme] || 0) + 1;
      }
    }
  }
  
  for (let seme in semiCoperti) {
    if (semiCoperti[seme] >= 5) {
      return true;
    }
  }
  return false;
}

// Verifica NAPOLA (Tris + Coppia)
export function verificaNapola(cartella, coperte) {
  const valoriCoperti = {};
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        const valore = cartella[r][c].valore;
        valoriCoperti[valore] = (valoriCoperti[valore] || 0) + 1;
      }
    }
  }
  
  let trisValori = [];
  let coppiaValori = [];
  
  for (let valore in valoriCoperti) {
    if (valoriCoperti[valore] >= 3) {
      trisValori.push(valore);
    } else if (valoriCoperti[valore] >= 2) {
      coppiaValori.push(valore);
    }
  }

  if (trisValori.length >= 1 && coppiaValori.length >= 1) return true;
  
  return false;
}

// Verifica COMBOCARD REALE (4 carte in sequenza stesso seme)
export function verificaCombocardReale(cartella, coperte) {
  const carteCoperte = [];
  
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (coperte[r][c]) {
        carteCoperte.push(cartella[r][c]);
      }
    }
  }
  
  const perSeme = {};
  carteCoperte.forEach(carta => {
    if (!perSeme[carta.seme]) perSeme[carta.seme] = [];
    perSeme[carta.seme].push(carta.valoreNum);
  });
  
  for (let seme in perSeme) {
    const valori = [...new Set(perSeme[seme])].sort((a, b) => a - b);

    for (let i = 0; i <= valori.length - 4; i++) {
      if (valori[i+1] === valori[i] + 1 &&
          valori[i+2] === valori[i] + 2 &&
          valori[i+3] === valori[i] + 3) {
        return true;
      }
    }
  }
  return false;
}

// Verifica collezione
export function verificaCollezione(cartella, coperte, tipo) {
  switch(tipo) {
    case 'tris': return verificaTris(cartella, coperte);
    case 'sequenza': return verificaSequenza(cartella, coperte);
    case 'scopa': return verificaScopa(cartella, coperte);
    case 'napola': return verificaNapola(cartella, coperte);
    case 'combocard_reale': return verificaCombocardReale(cartella, coperte);
    default: return false;
  }
}

// Auto-claim: verifica e assegna premi per collezioni completate
export function autoClaimCollezioni(game, gameId, io, gameState) {
  const tipiCollezioni = ['tris', 'sequenza', 'scopa', 'napola', 'combocard_reale'];
  
  for (const tipo of tipiCollezioni) {
    if (game.collezioni[tipo].vinto) continue;
    
    const vincitori = [];
    
    for (const player of game.players) {
      if (player.collezioni && player.collezioni.includes(tipo)) continue;
      
      const completata = verificaCollezione(player.cartella, player.coperte, tipo);
      if (completata) {
        vincitori.push(player);
      }
    }
    
    if (vincitori.length > 0) {
      const ammontare = game.collezioniDistribuzione[tipo];
      const premioPerGiocatore = Math.floor(ammontare / vincitori.length);
      
      game.collezioni[tipo].vinto = true;
      game.collezioni[tipo].vincitore = vincitori.map(v => v.id);
      
      for (const vincitore of vincitori) {
        vincitore.collezioni = vincitore.collezioni || [];
        vincitore.collezioni.push(tipo);
        vincitore.gettoni += premioPerGiocatore;
        
        if (vincitore.jollyPos && vincitore.jollyUsato) {
          vincitore.jollyUsedFor = tipo;
        }
        
        // Emetti aggiornamento gettoni per ogni vincitore
        io.to(gameId).emit('gettoniAggiornati', {
          playerId: vincitore.id,
          gettoni: vincitore.gettoni
        });
      }
      
      const vincitoriInfo = vincitori.map(v => ({ id: v.id, name: v.name }));
      
      io.to(gameId).emit('collezioneVinta', {
        tipo,
        vincitore: vincitori.length === 1 ? vincitoriInfo[0] : vincitoriInfo,
        vincitori: vincitoriInfo,
        ammontare: premioPerGiocatore,
        divided: vincitori.length > 1,
        players: vincitori
      });
      
      if (tipo === 'combocard_reale') {
        finishGameFromAuto(game, gameId, io, gameState);
      }
    }
  }
}

function finishGameFromAuto(game, gameId, io, gameState) {
  game.status = 'finished';
  
  // Accredita SOLO i gettoni vinti (non il totale) ai giocatori
  for (const gamePlayer of game.players) {
    const player = gameState.players[gamePlayer.id];
    if (player) {
      // I gettoni del giocatore sono già i suoi crediti rimanenti + vincite
      // Non sommiamo, sostituiamo
      player.credits = gamePlayer.gettoni;
      player.currentGameId = null;
    }
  }
  
  const vincitori = game.players
    .filter(p => p.collezioni.includes('combocard_reale'))
    .map(p => ({ id: p.id, name: p.name }));
  
  io.to(gameId).emit('gameFinished', { 
    vincitore: vincitori.length === 1 ? vincitori[0] : null,
    vincitori: vincitori
  });
}