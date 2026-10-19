"use client";

import { Popover } from "@/components/Popover";
import { ELEMENT_STATUSES, type LibraryElement } from "@/lib/elements";
import { useStudio } from "@/store/studio";

/**
 * The element's review status as a round button in its picture's corner;
 * pressing it opens the list. Clicks stop here, so the card under it stays shut.
 */
export function ElementStatusMenu({ element, className = "absolute bottom-2 left-2" }: { element: LibraryElement; className?: string }) {
  const saveElement = useStudio((s) => s.saveElement);
  const now = ELEMENT_STATUSES.find((x) => x.id === element.status);
  return (
    <span
      // Over the picture only while the pointer is on the card (always on touch), and while its list is open.
      className={`${className} hover-reveal opacity-0 transition-opacity duration-[150ms] group-hover:opacity-100 [&:has([aria-expanded=true])]:opacity-100`}
      onClick={(event) => event.stopPropagation()}
    >
      <Popover
        width={230}
        title="Status"
        trigger={() => (
          <span role="img" aria-label={`Status: ${now?.label ?? "none"}`} data-round className="grid h-7 w-7 place-items-center max-md:h-6 max-md:w-6 rounded-full bg-black/55 ring-1 ring-inset ring-white/25 transition-colors duration-[120ms] hover:bg-black/80">
            {now ? <span className="h-3 w-3 rounded-full" style={{ background: now.dot }} /> : <span className="h-3 w-3 rounded-full border border-dashed border-white/70" />}
          </span>
        )}
      >
        {(close) => (
          <>
            {[...ELEMENT_STATUSES, { id: undefined, label: "No status", dot: undefined }].map((x) => (
              <button
                key={x.id ?? "none"}
                type="button"
                onClick={() => {
                  saveElement({ ...element, status: x.id });
                  close();
                }}
                className={`flex w-full items-center gap-3 rounded-chip px-3 py-2.5 text-left text-[14px] font-medium transition-colors duration-[120ms] ${element.status === x.id ? "bg-t1/[0.08] text-t1" : "text-t2 hover:bg-t1/[0.06] hover:text-t1"}`}
              >
                {x.dot ? <span className="h-3 w-3 rounded-full" style={{ background: x.dot }} /> : <span className="h-3 w-3 rounded-full border border-dashed border-t3" />}
                {x.label}
              </button>
            ))}
          </>
        )}
      </Popover>
    </span>
  );
}
