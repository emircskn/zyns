"use client";

import { ChoiceDialog } from "@/components/ChoiceDialog";
import { useProjectDelete } from "@/lib/newProject";
import { TRASH_DAYS, useStudio } from "@/store/studio";

/**
 * The one question asked when work is deleted inside a project: it goes to
 * the project's Trash and stays in My Generations (or Assets, for an
 * upload), unless the box for deleting it everywhere is ticked.
 */
export function ProjectDeleteDialog() {
  const ask = useProjectDelete((s) => s.ask);
  const close = useProjectDelete((s) => s.close);
  const runs = useStudio((s) => s.runs);
  const uploads = useStudio((s) => s.uploads);
  const runIds = ask?.runIds ?? [];
  const uploadIds = ask?.uploadIds ?? [];
  const count = runIds.length + uploadIds.length;
  const onlyUploads = runIds.length === 0 && uploadIds.length > 0;
  const what = count > 1 ? `${count} items` : onlyUploads ? "upload" : "generation";
  // In a project it goes to that project's Trash, elsewhere to Cinema Studio's; never straight out.
  const inProject = [...runs.filter((r) => runIds.includes(r.id)), ...uploads.filter((u) => uploadIds.includes(u.id))].some((x) => x.projectId);
  const where = inProject ? "this project's Trash" : "the Trash";

  return (
    <ChoiceDialog
      open={!!ask && count > 0}
      title={`Move ${what} to Trash?`}
      message={`${count > 1 ? "They" : `This ${what}`} will be moved to ${where}, where you can restore ${count > 1 ? "them" : "it"} for ${TRASH_DAYS} days.`}
      confirmLabel="Move to Trash"
      onConfirm={() => {
        useStudio.getState().setTrashed(
          [
            ...runs.filter((r) => runIds.includes(r.id)).flatMap((r) => r.urls),
            ...uploads.filter((u) => uploadIds.includes(u.id)).map((u) => u.url),
          ],
          true,
        );
        ask?.onDone?.();
        close();
      }}
      onClose={close}
    />
  );
}
