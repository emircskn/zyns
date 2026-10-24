/**
 * Higgsfield, switched off for now (one key, KIE's): its models, key, switch,
 * badges and the pages that run on it (Genjutsu, Cinema Studio, Soul ID) are
 * hidden, not deleted. Set to true and everything comes back as it was.
 */
export const HIGGSFIELD = false;

/** Whether a page is on offer: Genjutsu and Cinema Studio run on Higgsfield. */
export const pageOffered = (id: string) => HIGGSFIELD || (id !== "remix" && id !== "studio");
