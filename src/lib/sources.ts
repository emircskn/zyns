import type { Field } from "@/lib/registry";
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

/** What a source field can pick from, newest first. */
export function sourceItems(field: Field, runs: Run[], modelId: string): SourceItem[] {
  const spec = field.source ?? { of: "task" as const };
  const models = spec.models ?? [modelId];
  const done = runs.filter((r) => r.state === "success");
  const title = (r: Run) => r.prompt?.trim() || r.modelName;
  switch (spec.of) {
    case "task":
      return done
        .filter((r) => r.taskId && !r.made && models.includes(r.modelId))
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

