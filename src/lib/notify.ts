/**
 * A short line over the bottom of the screen that fades by itself ("Model
 * switched to Seedance 2.5"). Drawn straight on the page: it needs no
 * component mounted and survives the page swapping under it.
 */
export function notify(text: string): void {
  if (typeof document === "undefined") return;
  const note = document.createElement("div");
  note.textContent = text;
  note.setAttribute("role", "status");
  note.style.cssText =
    "position:fixed;left:50%;bottom:112px;transform:translateX(-50%);z-index:300;max-width:min(320px,86vw);padding:10px 16px;border-radius:14px;" +
    "background:var(--popover);color:var(--t1);font-size:13px;line-height:1.35;box-shadow:var(--shadow-pop);outline:1px solid var(--edge);" +
    "opacity:0;transition:opacity 160ms ease-out;pointer-events:none";
  document.body.append(note);
  requestAnimationFrame(() => (note.style.opacity = "1"));
  window.setTimeout(() => {
    note.style.opacity = "0";
    window.setTimeout(() => note.remove(), 200);
  }, 2600);
}
