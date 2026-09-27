/**
 * Entry for the single-file build: the same studio, no server. The page
 * talks to api.kie.ai and api.higgsfield.ai straight from the browser (both
 * allow it), so it can be opened from a phone or any static host.
 */
import { createRoot } from "react-dom/client";
import { Shell } from "@/components/Shell";

window.__KIE_DIRECT__ = true;
window.__HF_DIRECT__ = true;

const root = document.getElementById("root");
if (root) createRoot(root).render(<Shell />);
