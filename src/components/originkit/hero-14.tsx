"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import Sparkles from "@/components/originkit/ui/hero-14/sparkles";
import ArrowBadge from "@/components/originkit/ui/hero-14/arrow-badge";
import { ZynsMark } from "@/components/Logo";

/**
 * Originkit's hero-14 section, wired for ZYNS.
 *
 * The frame is the section as it ships — the beam wash, the grid at both
 * edges, the drifting sparkles, the ring, the four tags pointing in at the
 * headline. What changed is what it says and who it is for: the navbar came
 * out (the studio has its own), the ring holds the ZYNS mark, the tags are
 * the four kinds of work and open them, and the buttons drive the page. The
 * section keeps its own near-black ground in both themes, because the
 * artwork was drawn for one.
 *
 * Height comes in from the page through `--ok-design-h`; left alone the
 * section fills a viewport, which is what the catalogue preview wants.
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

type TagSide = "left" | "right";
interface FloatingTagData {
  id: string;
  label: string;
  side: TagSide;
  className: string;
}

/* The four kinds of work, fanned around the ring: the upper pair beside its
   shoulders, the lower pair further out. Tops are measured from the headline
   column, which starts just under the ring. */
const TAGS: FloatingTagData[] = [
  {
    id: "image",
    label: "Stills",
    side: "left",
    className: "left-[150px] top-[-160px] xl:left-[100px]",
  },
  {
    id: "video",
    label: "Motion",
    side: "left",
    className: "left-[18px] top-[-60px] xl:left-[-50px]",
  },
  {
    id: "audio",
    label: "Sound",
    side: "right",
    className: "right-[150px] top-[-160px] xl:right-[100px]",
  },
  {
    id: "tool",
    label: "Clean-ups",
    side: "right",
    className: "right-[8px] top-[-60px] xl:right-[-50px]",
  },
];

function LogoBadge() {
  return (
    <div className="relative flex items-center justify-center">
      {/* The ring the section ships with, holding the studio's mark. */}
      <img
        src="/originkit/hero-14/icon-container.svg"
        alt=""
        aria-hidden
        width={168}
        height={168}
        className="relative size-[104px] select-none sm:size-[168px]"
      />
      <span className="absolute grid place-items-center">
        <ZynsMark size={41} className="sm:h-[66px] sm:w-[66px]" tile="#f5efe6" ink="#050505" />
      </span>
    </div>
  );
}

function FloatingTag({
  data,
  variants,
  onClick,
}: {
  data: FloatingTagData;
  variants: Variants;
  onClick?: () => void;
}) {
  const arrowLeft = data.side === "left";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      variants={variants}
      className={`absolute z-20 hidden min-[1100px]:flex ${data.className} items-center justify-center gap-[10px] rounded-[10px] border border-dark12 bg-dark10 px-[10px] py-[6px] transition-colors duration-200 hover:border-white/25 hover:bg-dark12`}
    >
      <img
        src="/originkit/hero-14/arrow.svg"
        alt=""
        width={18}
        height={20}
        className={`absolute h-[20px] w-[17px] ${
          arrowLeft ? "left-[88px] top-[-16px] -scale-x-100" : "right-[88px] top-[-16px]"
        }`}
      />
      <span className="whitespace-nowrap text-[14px] font-medium leading-[1.5] text-white xl:text-[16px]">
        {data.label}
      </span>
    </motion.button>
  );
}

function Beams() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      initial={reduce ? false : { opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 1 }}
      transition={{ duration: 4, ease: EASE, delay: 0.1 }}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
    >
      {/* Wide: two washes raking in from either side. */}
      <img
        src="/originkit/hero-14/abstract-design.svg"
        alt=""
        className="absolute left-[200px] top-[-40px] w-[440px] max-w-none rotate-[5deg] select-none max-[782px]:hidden sm:w-[440px] md:left-[560px] md:top-[-40px] lg:left-[800px] lg:top-[-10px] lg:w-[460px] xl:left-[1000px] xl:top-[-50px] xl:w-[660px]"
      />
      <img
        src="/originkit/hero-14/abstract-design.svg"
        alt=""
        className="absolute right-[200px] top-[-40px] w-[440px] max-w-none -scale-x-100 rotate-[-5deg] select-none max-[782px]:hidden sm:w-[440px] md:right-[560px] md:top-[-40px] lg:right-[800px] lg:top-[-10px] lg:w-[460px] xl:right-[1000px] xl:top-[-50px] xl:w-[660px]"
      />
      {/* Narrow: the same light, cut for a phone. */}
      <img
        src="/originkit/hero-14/light-375.svg"
        alt=""
        className="absolute left-[-100px] top-[-80px] z-10 hidden w-[320px] max-w-none rotate-[25deg] select-none max-[782px]:block"
      />
      <img
        src="/originkit/hero-14/light-375.svg"
        alt=""
        className="absolute right-[-100px] top-[-80px] z-10 hidden w-[320px] max-w-none -scale-x-100 rotate-[-25deg] select-none max-[782px]:block"
      />
    </motion.div>
  );
}

export default function Hero14({
  headline,
  accent,
  subtitle,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onTag,
  height = "min(760px, calc(88svh - var(--nav-h, 0px)))",
}: {
  headline: string;
  /** The last words of the headline, carried in the accent. */
  accent?: string;
  subtitle: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onTag?: (id: string) => void;
  height?: string;
}) {
  const reduce = useReducedMotion();

  const passthrough: Variants = { hidden: {}, show: {} };
  const seqRise = (order: number): Variants =>
    reduce
      ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
      : {
          hidden: { opacity: 0, y: 36 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.8, ease: EASE, delay: 0.1 + order * 0.2 },
          },
        };
  const seqPop = (order: number): Variants =>
    reduce
      ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
      : {
          hidden: { opacity: 0, scale: 0.82 },
          show: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.6, ease: EASE, delay: 0.1 + order * 0.2 },
          },
        };

  return (
    <section
      aria-label="ZYNS"
      style={{ "--ok-design-h": height } as React.CSSProperties}
      className="hero-14 relative isolate flex w-full flex-col rounded-panel border border-line bg-dark02 font-grotesk antialiased"
    >
      <Beams />

      {/* Wide: the grid at the top edge. */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[1920px] max-w-none -translate-x-1/2 overflow-hidden max-[782px]:hidden">
        <img
          src="/originkit/hero-14/grid-top.svg"
          alt=""
          className="size-full rotate-180 object-cover opacity-60"
        />
      </div>
      {/* Narrow: the same, cut for a phone. */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-0 hidden h-[220px] w-full -translate-x-1/2 rotate-180 overflow-hidden max-[782px]:block">
        <img
          src="/originkit/hero-14/grid-375.svg"
          alt=""
          className="size-full rotate-180 object-cover opacity-60"
        />
      </div>
      {/* And at the bottom edge, where the page carries on. */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[220px] w-full -translate-x-1/2 overflow-hidden">
        <img
          src="/originkit/hero-14/grid-375.svg"
          alt=""
          className="size-full rotate-180 object-cover opacity-70"
        />
      </div>

      <motion.div
        variants={passthrough}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 py-6 sm:py-10 md:max-w-[450px] md:px-6 lg:max-w-[890px] min-[1440px]:max-w-[1280px]"
      >
        <motion.div variants={seqRise(0)} className="relative mb-[10px]">
          <Sparkles />
          <LogoBadge />
        </motion.div>

        <motion.div
          variants={passthrough}
          className="relative flex w-full max-w-[900px] flex-col items-center gap-[14px]"
        >
          {TAGS.map((tag) => (
            <FloatingTag
              key={tag.id}
              data={tag}
              variants={seqPop(4)}
              onClick={onTag ? () => onTag(tag.id) : undefined}
            />
          ))}

          <motion.h1
            variants={seqRise(1)}
            className="m-0 max-w-[760px] text-center text-[28px] font-bold leading-[1.2] text-white sm:text-[28px] lg:text-[48px] xl:text-[54px]"
          >
            {headline}
            {accent && <span className="text-hero-accent"> {accent}</span>}
          </motion.h1>

          <motion.p
            variants={seqRise(2)}
            className="m-0 max-w-[620px] text-center text-[14px] font-medium leading-[1.5] text-grey50 sm:text-[16px] lg:text-[16px] xl:text-[18px]"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        <motion.div
          variants={seqRise(3)}
          className="mt-7 flex w-full flex-col items-center justify-center gap-[14px] sm:mt-[50px] sm:flex-row sm:gap-[20px]"
        >
          <motion.button
            type="button"
            onClick={onPrimary}
            whileHover={reduce ? undefined : { scale: 1.03 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="group flex items-center gap-[12px] rounded-[100px] border-0 bg-hero-accent py-[8px] pl-[32px] pr-[8px]"
          >
            <span className="whitespace-nowrap text-[16px] font-bold leading-[1.5] text-dark02 xl:text-[18px]">
              {primaryLabel}
            </span>
            <ArrowBadge />
          </motion.button>

          {secondaryLabel && (
            <motion.button
              type="button"
              onClick={onSecondary}
              whileHover={reduce ? undefined : { scale: 1.03 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              className="group flex items-center gap-[12px] rounded-[100px] bg-dark06 py-[8px] pl-[16px] pr-[8px] outline outline-2 outline-offset-[-2px] outline-dark10"
            >
              <span className="whitespace-nowrap text-[16px] font-normal leading-[1.5] text-hero-accent xl:text-[18px]">
                {secondaryLabel}
              </span>
              <ArrowBadge bordered />
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
