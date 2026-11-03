/**
 * RegoleGioco Component
 *
 * The full rules of the game and how it works, in plain words, for the
 * "Come si gioca" section under the collections. The prize shares are read
 * from the game, so they are the ones this game really uses.
 */

import React from "react";
import PropTypes from "prop-types";

const COLLEZIONI = [
  { tipo: "tris", nome: "Tris", regola: "tre carte coperte con lo stesso valore (una riga della cartella)." },
  { tipo: "sequenza", nome: "Sequenza", regola: "quattro valori di fila coperti, di semi qualsiasi (per esempio Tre, Quattro, Cinque, Sei). Dopo il Re non si riparte dall'Asso." },
  { tipo: "scopa", nome: "Scopa", regola: "cinque carte coperte dello stesso seme (una colonna), anche non vicine." },
  { tipo: "napola", nome: "Napola", regola: "tre carte coperte con lo stesso valore e due con un altro valore." },
  { tipo: "combocard_reale", nome: "Combocard Reale", regola: "quattro valori di fila coperti, tutti dello stesso seme. Chiude la partita." },
];

const EFFETTO_JOLLY = [
  "Tris, Sequenza, Napola: la carta cambia valore e tiene il seme.",
  "Scopa: la carta cambia seme e tiene il valore.",
  "Combocard Reale: la carta cambia valore e seme.",
];

const quota = (game, tipo) => {
  const premio = game?.collezioniDistribuzione?.[tipo];
  const pozzo = game?.montepremi;
  if (!premio || !pozzo) return null;
  return Math.round((premio / pozzo) * 100);
};

function Sezione({ titolo, children }) {
  return (
    <section className="space-y-1.5">
      <h4 className="titolo text-base text-testo">{titolo}</h4>
      {children}
    </section>
  );
}

Sezione.propTypes = { titolo: PropTypes.string.isRequired, children: PropTypes.node };

function RegoleGioco({ game = null }) {
  return (
    <div className="space-y-4 pb-3 text-sm leading-relaxed text-testo-2 [text-wrap:pretty]">
      <Sezione titolo="Lo scopo">
        <p>
          Completare per primo le collezioni sulla tua cartella. Ogni collezione vinta ti porta una parte del
          montepremi.
        </p>
      </Sezione>

      <Sezione titolo="Come funziona una partita">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            All&apos;inizio ogni giocatore paga i crediti d&apos;ingresso: messi insieme formano il montepremi.
          </li>
          <li>
            Si gioca da 2 a 10. La partita parte quando il creatore la avvia, o da sola se si riempie.
          </li>
          <li>Ognuno riceve una cartella di 25 carte diverse, prese dal mazzo napoletano da 40.</li>
          <li>
            Estrae solo il creatore, una carta alla volta e con almeno 8 secondi tra una e l&apos;altra. La carta
            uscita si rivela a tutti.
          </li>
          <li>
            Se la carta è sulla tua cartella si copre da sola con un sigillo: non devi fare niente. Quando una
            collezione si completa, si vince da sola.
          </li>
        </ol>
      </Sezione>

      <Sezione titolo="La cartella">
        <p>
          I valori stanno nelle righe (Asso, Due, Tre, Quattro, Cinque, Sei, Sette, Fante, Cavallo, Re), i semi nelle
          colonne (Denari, Coppe, Spade, Bastoni). I posti vuoti sono le carte che non hai. La posizione serve solo a
          leggere meglio: per vincere conta quali carte sono coperte, non dove stanno.
        </p>
      </Sezione>

      <Sezione titolo="Le collezioni">
        <ul className="space-y-1.5">
          {COLLEZIONI.map(({ tipo, nome, regola }) => {
            const percento = quota(game, tipo);
            return (
              <li key={tipo}>
                <strong className="text-testo">{nome}</strong>
                {percento ? ` (${percento}% del montepremi)` : ""}: {regola}
              </li>
            );
          })}
        </ul>
        <p>
          Ogni collezione si vince una volta sola per partita, dal primo che la completa. Se più giocatori la
          completano con la stessa estrazione, si dividono il premio in parti uguali.
        </p>
      </Sezione>

      <Sezione titolo="Il Jolly">
        <p>
          Hai un Jolly a partita. Si usa quando a una collezione manca <strong className="text-testo">una sola carta</strong>:
          scegli la collezione, poi una carta della cartella non ancora coperta. Il Jolly la trasforma nella carta
          che manca e la copre subito.
        </p>
        <ul className="space-y-1">
          {EFFETTO_JOLLY.map((riga) => (
            <li key={riga}>{riga}</li>
          ))}
        </ul>
        <p>
          Non può diventare una carta che hai già nella cartella, e non si usa su una collezione già vinta. Le carte
          che puoi cambiare sono evidenziate, e prima di confermare ti dice quale carta diventa.
        </p>
      </Sezione>

      <Sezione titolo="Come finisce">
        <p>
          La partita finisce quando qualcuno completa la Combocard Reale. I premi delle collezioni che nessuno ha
          vinto si dividono in parti uguali tra tutti i giocatori. I crediti vinti restano tuoi. Se esci prima della
          fine, perdi i crediti d&apos;ingresso.
        </p>
      </Sezione>
    </div>
  );
}

RegoleGioco.propTypes = {
  game: PropTypes.shape({
    montepremi: PropTypes.number,
    collezioniDistribuzione: PropTypes.object,
  }),
};

export default RegoleGioco;
