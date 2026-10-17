"use client";

import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";

/** How a list in the side menu is ordered, as Higgsfield's Sort by offers. */
export type SortKey = "first" | "last" | "changed" | "az" | "za";

const OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: "first", label: "First created" },
  { id: "last", label: "Last created" },
  { id: "changed", label: "Last changed" },
  { id: "az", label: "Name A-Z" },
  { id: "za", label: "Name Z-A" },
];

/** A comparator for things with a name, a creation time and a last-changed time. */
export function sortBy<T>(key: SortKey, of: (item: T) => { name: string; created: number; changed: number }) {
  return (a: T, b: T) => {
    const x = of(a);
    const y = of(b);
    switch (key) {
      case "first":
        return x.created - y.created;
      case "last":
        return y.created - x.created;
      case "changed":
        return y.changed - x.changed;
      case "az":
        return x.name.localeCompare(y.name);
      case "za":
        return y.name.localeCompare(x.name);
    }
  };
}

/** The sort icon in a side-menu heading, opening the Sort by list with a tick on the one in use. */
export function SortMenu({ value, onChange, label }: { value: SortKey; onChange: (key: SortKey) => void; label: string }) {
  return (
    <Popover
      width={200}
      align="end"
      trigger={(open) => (
        <span
          aria-label={label}
          title={label}
          className={`grid h-6 w-6 place-items-center rounded-full hover:text-t1 ${open || value !== "last" ? "text-t1" : "text-t3"} ${open ? "bg-t1/[0.1]" : ""}`}
        >
          <Icon name="sort" size={13} />
        </span>
      )}
    >
      {(close) => (
        <div className="flex flex-col">
          <p className="px-2.5 pb-1 pt-1.5 text-[12px] font-medium text-t3">Sort by</p>
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                close();
              }}
              className="flex h-9 items-center justify-between rounded-chip px-2.5 text-left text-[13.5px] text-t1 hover:bg-t1/[0.06]"
            >
              <span className="font-semibold">{option.label}</span>
              {value === option.id && <Icon name="check" size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}
