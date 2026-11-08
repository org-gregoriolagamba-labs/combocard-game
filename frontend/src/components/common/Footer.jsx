/**
 * Footer
 *
 * At the foot of the login screen and of the hall: the name of the app with its trademark sign,
 * the copyright, the version, and the link to the "Info e contatti" dialog.
 * The sign is ™ and not ®, because the trademark is not registered.
 */

import React, { useState } from "react";
import InfoDialog from "./InfoDialog";
import { APP_VERSION, BUILD_DATE, copyrightYears } from "../../config/buildInfo";
import { CONTATTI, MARCHIO } from "../../config/contatti";

function Footer() {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <footer className="mt-4 border-t border-linea pt-3 text-center text-xs text-testo-2">
      <p className="[overflow-wrap:anywhere]">
        <span className="font-bold text-testo">{MARCHIO.nome}™</span>
        {" · "}
        © {copyrightYears(MARCHIO.annoInizio, BUILD_DATE)} {CONTATTI.autore}
      </p>
      <p className="flex flex-wrap items-center justify-center gap-x-2">
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="min-h-[44px] rounded-lg px-2 font-bold text-testo-2 underline decoration-2 underline-offset-4 hover:text-testo"
        >
          Info e contatti
        </button>
        {APP_VERSION && (
          <>
            <span aria-hidden="true">·</span>
            <span>v{APP_VERSION}</span>
          </>
        )}
      </p>

      {showInfo && <InfoDialog onClose={() => setShowInfo(false)} />}
    </footer>
  );
}

export default Footer;
