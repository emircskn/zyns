import type { Field, Values } from "@/lib/registry";
import type { Segment } from "@/lib/results";
import { mediaKind } from "@/lib/upload";
import type { Run } from "@/store/studio";

/* ------------------------------------------------------------------ *
 * Sources: earlier results a field points at by ID
 * ------------------------------------------------------------------ */

export interface SourceItem {
  /** The ID the field sends. */
  id: string;
  title: string;
  /** A picture or clip to show, if the result has one. */
  thumb?: string;
  icon: "audio" | "mic" | "image";
  run: Run;
}

/**
 * A segment map's parts, each shown by its kept copy: Grok's mask links are
 * temporary, and the run's files are those masks in index order. A map made
 * before its parts were recorded reads them off its files alone.
 */
export function segmentsOf(run: Run): Segment[] | undefined {
  if (!run.segments && !run.mode?.startsWith("segment-map")) return undefined;
  const parts: Segment[] = run.segments ?? run.urls.map((_, index) => ({ index }));
  return parts.map((s, i) => ({ ...s, url: run.urls[i] ?? s.url }));
}

/** What a source field can pick from, newest first. */
export function sourceItems(field: Field, runs: Run[], modelId: string, values?: Values): SourceItem[] {
  const spec = field.source ?? { of: "task" as const };
  const models = spec.models ?? [modelId];
  const done = runs.filter((r) => r.state === "success");
  const title = (r: Run) => r.prompt?.trim() || r.modelName;
  switch (spec.of) {
    case "task":
      return done
        .filter((r) => r.taskId && !r.made && models.includes(r.modelId) && !spec.notFrom?.includes(r.mode ?? ""))
        .map((r) => ({ id: r.taskId!, title: title(r), thumb: r.urls.find((u) => mediaKind(u) !== "audio"), icon: "audio", run: r }));
    case "track":
      return done
        .filter((r) => models.includes(r.modelId))
        .flatMap((r) =>
          (r.tracks ?? []).map((t, i) => ({
            id: t.id,
            title: t.title || `${title(r)} · ${i + 1}`,
            thumb: t.image,
            icon: "audio" as const,
            run: r,
          })),
        );
    case "segment": {
      // The parts of the segment map picked in the same request's task field.
      const map = done.find((r) => r.taskId && r.taskId === values?.task_id);
      return (map ? segmentsOf(map) ?? [] : []).map((s) => ({
        id: String(s.index),
        title: s.name || `Part ${s.index + 1}`,
        thumb: s.url,
        icon: "image" as const,
        run: map!,
      }));
    }
    case "character":
    case "voice":
      return done
        .filter((r) => r.made?.kind === spec.of)
        .map((r) => ({
          id: r.made!.id,
          title: r.made!.name || (spec.of === "character" ? "Character" : "Voice"),
          thumb: r.made!.image,
          icon: spec.of === "voice" ? "mic" : "image",
          run: r,
        }));
  }
}

