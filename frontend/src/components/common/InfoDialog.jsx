/**
 * InfoDialog
 *
 * "Info e contatti": the version and the date of the build, a few words about the game
 * and where to find the author. It opens from the login screen and from the hall.
 */

import React from "react";
import PropTypes from "prop-types";
import Modal from "./Modal";
import { APP_VERSION, BUILD_DATE, formatBuildDate } from "../../config/buildInfo";
import { CONTATTI } from "../../config/contatti";

const linkClass =
  "inline-flex min-h-[44px] items-center font-bold text-oro underline decoration-2 underline-offset-4 [overflow-wrap:anywhere] hover:text-oro-dark";

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (si apre in una nuova scheda)</span>
    </a>
  );
}

ExternalLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function InfoDialog({ onClose }) {
  return (
    <Modal isOpen onClose={onClose} title="Info e contatti">
      <p className="text-testo-2 [overflow-wrap:anywhere] [text-wrap:pretty]">
        ComboCard è un gioco di carte napoletane per più giocatori, in tempo reale: si estraggono le carte,
        si completano le combinazioni e si vincono i premi del montepremi. Si gioca con crediti di gioco,
        senza valore reale.
      </p>

      <dl className="mt-4 space-y-2 border-t border-linea pt-4 text-sm">
        <div>
          <dt className="font-bold text-testo-2">Versione</dt>
          <dd className="text-testo [overflow-wrap:anywhere]">{APP_VERSION || "non disponibile"}</dd>
        </div>
        <div>
          <dt className="font-bold text-testo-2">Ultimo aggiornamento</dt>
          <dd className="text-testo [overflow-wrap:anywhere]">
            <time dateTime={BUILD_DATE || undefined}>{formatBuildDate(BUILD_DATE)}</time>
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-linea pt-4">
        <h3 className="titolo text-lg text-testo">Contatti</h3>
        <p className="mt-1 text-testo [overflow-wrap:anywhere]">{CONTATTI.autore}</p>
        <ul className="mt-1">
          <li><ExternalLink href={CONTATTI.linkedin}>LinkedIn</ExternalLink></li>
          <li><ExternalLink href={CONTATTI.repository}>Repository su GitHub</ExternalLink></li>
          {CONTATTI.email && (
            <li>
              <a href={`mailto:${CONTATTI.email}`} className={linkClass}>{CONTATTI.email}</a>
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
}

InfoDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default InfoDialog;
