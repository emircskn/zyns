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
  const home = onlyUploads ? "Assets" : "My Generations";

  return (
    <ChoiceDialog
      open={!!ask && count > 0}
      title={`Delete ${what} from project?`}
      message={`${count > 1 ? "They" : `This ${what}`} will be moved to this project's Trash, where you can restore ${count > 1 ? "them" : "it"} for ${TRASH_DAYS} days. ${count > 1 ? "They stay" : "It stays"} in ${home}.`}
      check={{
        label: `Also delete from ${home}`,
        hint: `${count > 1 ? "They" : "It"} will be permanently deleted — this can't be undone`,
      }}
      confirmLabel="Delete"
      onConfirm={(everywhere) => {
        const state = useStudio.getState();
        if (everywhere) {
          runIds.forEach(state.removeRun);
          uploadIds.forEach(state.removeUpload);
        } else {
          state.setTrashed(
            [
              ...runs.filter((r) => runIds.includes(r.id)).flatMap((r) => r.urls),
              ...uploads.filter((u) => uploadIds.includes(u.id)).map((u) => u.url),
            ],
            true,
          );
        }
        ask?.onDone?.();
        close();
      }}
      onClose={close}
    />
  );
}
