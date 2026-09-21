"use client";


export default function ArrowBadge({
  bordered = false,
}: {
  bordered?: boolean;
}) {
  return (
    <span
      className={`relative flex size-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[50px] bg-dark04 ${
        bordered ? "outline outline-2 outline-offset-[-2px] outline-dark12" : ""
      }`}
    >
      {}
      <img
        src="/originkit/hero-14/arrow-forward.svg"
        alt=""
        width={16}
        height={16}
        className="absolute size-[16px] transition-all duration-300 ease-out group-hover:translate-x-[15px] group-hover:-translate-y-[15px] group-hover:opacity-0"
      />
      {}
      <img
        src="/originkit/hero-14/arrow-forward.svg"
        alt=""
        aria-hidden
        width={16}
        height={16}
        className="absolute size-[16px] -translate-x-[15px] translate-y-[15px] opacity-0 transition-all duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
      />
    </span>
  );
}