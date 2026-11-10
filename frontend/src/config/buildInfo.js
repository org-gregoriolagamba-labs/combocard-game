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

/**
 * The years of the copyright: "2026" or "2026–2027", from the first year to the year of the build
 * (the year in Rome). Without a usable date of the build, or if it is before the first year,
 * it is the first year alone.
 */
export function copyrightYears(firstYear, buildDate) {
  const date = new Date(buildDate);
  if (!buildDate || Number.isNaN(date.getTime())) {
    return String(firstYear);
  }
  const year = Number(date.toLocaleDateString("en-GB", { year: "numeric", timeZone: "Europe/Rome" }));
  return year > firstYear ? `${firstYear}–${year}` : String(firstYear);
}
