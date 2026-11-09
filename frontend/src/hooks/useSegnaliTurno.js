/**
 * useSegnaliTurno Hook
 *
 * The warning of the last seconds of a turn of the draws: a beep for each of the last five seconds
 * (5, 4, 3, 2, 1) and the siren at 0:00, when the server draws the card and warns the player. Everybody
 * hears it, since everybody sees the countdown. It goes with the countdown on the screen and never
 * replaces it. `scadenza` is the moment the turn ends, in the clock of the browser; null while there is
 * no turn or it is stopped (a player chooses the jolly): nothing sounds then. Whether the sounds are
 * heard at all (the game's choice, the player's mute) is decided by the sound service.
 */

import { useEffect } from "react";
import { suona } from "../services/soundService";

const SECONDI_DI_AVVISO = 5;

export function useSegnaliTurno(scadenza) {
  useEffect(() => {
    if (!scadenza) return undefined;

    // The last whole second seen: a sound plays when it changes, so none repeats and none is missed
    let ultimo = null;
    const controlla = () => {
      const secondi = Math.max(0, Math.ceil((scadenza - Date.now()) / 1000));
      if (secondi === ultimo) return;
      const precedente = ultimo;
      ultimo = secondi;

      if (secondi >= 1 && secondi <= SECONDI_DI_AVVISO) {
        suona("bip");
      } else if (secondi === 0 && precedente !== null && precedente > 0) {
        // Only if the end was seen coming: a screen opened on a turn already over stays quiet
        suona("sirena");
      }
    };

    controlla();
    const timer = setInterval(controlla, 200);
    return () => clearInterval(timer);
  }, [scadenza]);
}
