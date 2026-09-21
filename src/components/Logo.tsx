"use client";

/**
 * The ZYNS brand marks, taken straight from the supplied artwork: the badge
 * and the wordmark, as outlines, so they need no webfont and cannot reflow.
 *
 * The badge is one path with an even-odd fill, which is how the artwork draws
 * it: the Z is not painted on the tile, it is cut out of it. So the letter is
 * whatever the badge is standing on, and the whole mark takes a single colour
 * — the text colour by default, which makes it a cream tile with a canvas Z
 * in the dark theme and a black tile with a cream Z in the light one.
 *
 * The wordmark is the same four letters the artwork sets, in its own small
 * caps, and its box is the ink rather than the advances, so it sits flush
 * against whatever it is set beside.
 */
const MARK_PATH =
  "M75 0C88.798 0 100 11.202 100 25L100 75C100 88.798 88.798 100 75 100L25 100C11.202 100 0 88.798 0 75L0 25C0 11.202 11.202 0 25 0ZM7.007 55.488C7.002 55.731 7.099 55.98 7.32 56.21L26.351 76.01C26.717 76.391 27.35 76.621 28.03 76.621L81.962 76.621C83.344 76.621 84.306 75.711 83.833 74.849L77.579 63.461C77.293 62.94 76.545 62.593 75.707 62.593L62.665 62.593C61.804 62.593 61.038 62.961 60.772 63.504L58.223 68.695C57.955 69.239 57.191 69.607 56.328 69.607L56.276 69.607C55.597 69.607 53.729 69.815 52.899 69.001L39.962 55.808C39.11 54.93 40.062 53.774 41.637 53.774L80.006 53.311C80.671 53.311 81.294 53.09 81.664 52.721L92.658 45.253C92.895 45.018 92.998 44.76 92.993 44.51C92.998 44.268 92.901 44.018 92.679 43.789L73.649 23.99C73.283 23.609 72.649 23.379 71.968 23.379L18.038 23.379C16.656 23.379 15.694 24.289 16.166 25.149L22.421 36.538C22.707 37.059 23.455 37.406 24.293 37.406L37.333 37.406C38.196 37.406 38.96 37.039 39.228 36.494L41.777 31.304C42.043 30.76 42.809 30.393 43.671 30.393L43.724 30.393C44.401 30.393 46.271 30.185 47.101 30.999L61.272 44.447C62.124 45.326 61.172 46.481 59.597 46.481L19.994 46.205C19.327 46.205 18.706 46.426 18.336 46.795L7.342 54.745C7.105 54.982 7.002 55.239 7.007 55.488Z";

/** The badge, on a 100 x 100 box with its own 25% corner radius. */
export function ZynsMark({
  size = 24,
  fill = "var(--t1)",
  className,
}: {
  size?: number;
  fill?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d={MARK_PATH} fill={fill} fillRule="evenodd" />
    </svg>
  );
}

const WORD_PATH =
  "M0 526V455L388 115H29V0H665V66L280 402H688V526ZM1028 526V298L748 0H953L1049 103Q1055 110 1064 119.5Q1073 129 1082 139Q1091 149 1098.5 158Q1106 167 1110 171H1112Q1116 167 1123.5 158.5Q1131 150 1140 140Q1149 130 1158 120.5Q1167 111 1174 104L1271 0H1475L1190 298V526ZM2147 526 1816 265Q1785 241 1759 219.5Q1733 198 1716 183H1711Q1712 194 1713 205Q1714 216 1715 231Q1716 246 1716.5 266Q1717 286 1717 315V526H1561V0H1683L1999 249Q2027 271 2059 297Q2091 323 2114 343H2118Q2116 309 2114.5 282Q2113 255 2113 216V0H2269V526ZM3058 375Q3058 421 3050 450Q3042 479 3022.5 496Q3003 513 2970 519.5Q2937 526 2886 526H2421V407H2877Q2893 407 2899 402Q2905 397 2905 382V338Q2905 321 2898 317.5Q2891 314 2877 314H2601Q2556 314 2522 309.5Q2488 305 2466 291.5Q2444 278 2433 253Q2422 228 2422 187V145Q2422 98 2432 69.5Q2442 41 2463.5 25.5Q2485 10 2519 5Q2553 0 2600 0H3027V111H2593Q2584 113 2578.5 117Q2573 121 2573 136V181Q2573 197 2581 200.5Q2589 204 2601 204H2886Q2936 204 2969 209.5Q3002 215 3022 229Q3042 243 3050 267.5Q3058 292 3058 331Z";

/** Ink box of the wordmark: 3058 wide by 526 tall, so `height` is cap height. */
const WORD_RATIO = 3058 / 526;

export function ZynsWordmark({ height = 14, className }: { height?: number; className?: string }) {
  return (
    <svg
      width={height * WORD_RATIO}
      height={height}
      viewBox="0 0 3058 526"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={WORD_PATH} />
    </svg>
  );
}

/** Badge plus wordmark, for anywhere the name is spelled out. */
export function ZynsLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-t1 ${className}`}>
      <ZynsMark size={size} />
      {/* Caps at a little under half the badge, which is where the artwork's
          own two pages sit relative to each other. */}
      <ZynsWordmark height={size * 0.46} />
      <span className="sr-only">ZYNS</span>
    </span>
  );
}
