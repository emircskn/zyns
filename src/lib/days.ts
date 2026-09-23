/**
 * Media grouped by the day it was made, newest day first, each under a
 * heading like "July 19, 2026". The items keep the order they came in;
 * only a change of day starts a new group.
 */
export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const LABEL = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

function dayKey(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function byDay<T>(items: T[], timeOf: (item: T) => number): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  const index = new Map<string, DayGroup<T>>();
  for (const item of items) {
    const time = timeOf(item);
    const key = dayKey(time);
    let group = index.get(key);
    if (!group) {
      group = { key, label: LABEL.format(time), items: [] };
      index.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
