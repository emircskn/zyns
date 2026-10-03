import { storageKeyOf } from "@/lib/storage/client";
import { useStudio } from "@/store/studio";

/**
 * What else in the studio uses these files, said in words for a delete
 * confirmation: "@emir", "2 other runs", "your uploads", "the prompt box".
 * Only files with a kept copy count, since only those are held back from
 * deletion; the items being deleted themselves are left out.
 */
export function usedElsewhere(urls: string[], skip: { runs?: string[]; uploads?: string[] } = {}): string[] {
  const s = useStudio.getState();
  const needles = urls.flatMap((url) => {
    const key = s.copies[url]?.key ?? storageKeyOf(url);
    return key ? [url, key] : [];
  });
  if (needles.length === 0) return [];
  const uses = (value: unknown) => {
    const text = JSON.stringify(value);
    return needles.some((needle) => text.includes(needle));
  };
  const skipRuns = new Set(skip.runs ?? []);
  const skipUploads = new Set(skip.uploads ?? []);
  const found: string[] = [];
  for (const element of s.elements) if (uses(element)) found.push(`@${element.name}`);
  const runs = s.runs.filter((run) => !skipRuns.has(run.id) && uses(run)).length;
  if (runs > 0) found.push(runs === 1 ? "another run" : `${runs} other runs`);
  if (s.uploads.some((upload) => !skipUploads.has(upload.id) && uses(upload))) found.push("your uploads");
  if (s.motionClips.some(uses)) found.push("your motion library");
  if (uses(s.valuesByModel) || uses(s.refsByCategory)) found.push("the prompt box");
  if (uses(s.remix)) found.push("Genjutsu");
  return found;
}

/** The sentence a confirmation shows, or undefined when nothing else uses the files. */
export function keptNote(uses: string[], many = false): string | undefined {
  if (uses.length === 0) return undefined;
  const list = uses.length > 1 ? `${uses.slice(0, -1).join(", ")} and ${uses[uses.length - 1]}` : uses[0];
  return `${many ? "Some are" : "Also"} used by ${list}. ${
    many ? "They leave" : "It leaves"
  } the gallery, but the ${many ? "files are" : "file is"} kept so nothing breaks.`;
}
