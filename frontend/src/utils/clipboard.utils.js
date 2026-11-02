/**
 * Copy a text to the clipboard.
 *
 * `navigator.clipboard` exists only on secure pages (https or localhost), but
 * the game is also played over plain http on the local network: there the old
 * `execCommand("copy")` is the only way. Resolves to true when the text is copied.
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the old way
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  try {
    return typeof document.execCommand === "function" && document.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(field);
  }
}
