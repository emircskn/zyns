"use client";

/**
 * Save files the way a link does, one after another. Browsers rate-limit a
 * burst of downloads from one gesture, so they go out spaced apart, and a
 * cross-origin URL the `download` attribute cannot rename still opens.
 */
export function downloadAll(urls: string[]) {
  urls.forEach((url, index) => {
    window.setTimeout(() => {
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      link.target = "_blank";
      link.rel = "noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }, index * 220);
  });
}
