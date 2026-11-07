/**
 * Build info
 *
 * The version and the date of the build are put in the app by Vite when it builds
 * (see `define` in vite.config.mjs): the page needs no call to the server to show them.
 */

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "";
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE ?? "";

/** The date of the build as "8 novembre 2026", with the day in Rome. */
export function formatBuildDate(iso) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) {
    return "non disponibile";
  }
  return date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}
