"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEMO_PREFIX, demoRuns, demoUploads } from "@/lib/demo";
import { withoutInputs } from "@/lib/runInputs";
import { followRemoval, imageFields, imageRefs } from "@/lib/mentions";
import type { Made, Track } from "@/lib/results";
import { englishError, hasChinese } from "@/lib/kie/errors";
import {
  activeFields,
  defaultValues,
  getModel,
  type Category,
  type ModelDef,
  type Values,
} from "@/lib/registry";

export interface Run {
  id: string;
  taskId?: string;
  modelId: string;
  modelName: string;
  mode?: string;
  poll: string;
  prompt: string;
  /** Aspect ratio as a CSS value, so tiles reserve the right space while loading. */
  ratio: string;
  output: "image" | "video" | "audio";
  state: "queued" | "pending" | "running" | "success" | "failed";
  urls: string[];
  error?: string;
  createdAt: number;
  values: Values;
  /** Credits KIE charged for the finished task, as it reported them. */
  credits?: number;
  /** A song's tracks, for the Suno tools that work on one of them. */
  tracks?: Track[];
  /** A character or voice this run made, for later runs to use. */
  made?: Made;
}

export type Theme = "dark" | "light";

/** Which page is showing: one per category, plus the browsing pages. */
export type Page = Category | "assets" | "favorites" | "home";

/** A file the studio uploaded to KIE, kept so it can be reused as reference. */
export interface Upload {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  name?: string;
  createdAt: number;
}

interface StudioState {
  apiKey: string;
  theme: Theme;
  credits: number | null;
  category: Category;
  page: Page;
  /** Empty until a model is chosen: the studio never picks one for you. */
  modelId: string;
  /** What was typed in the prompt box while no model was chosen yet. */
  draft: string;
  /** How many copies of the next run to send, for models that make one at a time. */
  batch: number;
  /** How many tiles are picked, so the prompt bar can give up its place. */
  selecting: number;
  /**
   * A phone picks media through its Select button rather than a long press:
   * while this is on, a tap on a tile picks it instead of opening it.
   */
  selectMode: boolean;
  setSelectMode: (on: boolean) => void;
  /** A phone's full-screen composer, where the prompt box goes to be written in. */
  composer: boolean;
  /** A phone's catalogue of covers, opened by its Create button. */
  createOpen: boolean;
  /** The model each category was last used with, so pages remember. */
  modelByCategory: Partial<Record<Category, string>>;
  /**
   * The prompt last written in each category. Every model of a category
   * shows it, so switching Nano Banana for another image model keeps what
   * was typed; another category keeps its own.
   */
  promptByCategory: Partial<Record<Category, string>>;
  /**
   * The reference pictures last attached in each category, shared the same
   * way: attached in GPT Image, still there on switching to Nano Banana.
   */
  refsByCategory: Partial<Record<Category, string[]>>;
  valuesByModel: Record<string, Values>;
  runs: Run[];
  uploads: Upload[];
  /** Media kept by its URL, which is the one thing an output and an upload share. */
  favorites: string[];
  settingsOpen: boolean;
  pickerOpen: boolean;
  pickerTab: Category | "all";
  /** Opened from a category page: that page's models and nothing else. */
  pickerLocked: boolean;
  hydrated: boolean;

  setApiKey: (key: string) => void;
  setTheme: (theme: Theme) => void;
  setCredits: (credits: number | null) => void;
  setCategory: (category: Category) => void;
  setPage: (page: Page) => void;
  /** How many columns the galleries pack at the widest breakpoint. */
  density: number;
  setDensity: (density: number) => void;
  /** A phone has two: a grid of squares, or one piece of media at a time. */
  phoneGrid: boolean;
  setPhoneGrid: (grid: boolean) => void;
  selectModel: (id: string) => void;
  setDraft: (draft: string) => void;
  setBatch: (batch: number) => void;
  setSelecting: (count: number) => void;
  setComposer: (open: boolean) => void;
  setCreateOpen: (open: boolean) => void;
  setValue: (key: string, value: unknown) => void;
  setValues: (values: Values) => void;
  resetValues: () => void;
  /** Empty a model's media inputs, as a sent run does; the prompt stays. */
  clearInputs: (modelId: string) => void;
  setMode: (mode: string) => void;
  toggleSettings: (open?: boolean) => void;
  togglePicker: (open?: boolean, tab?: Category | "all", locked?: boolean) => void;

  addUpload: (upload: Upload) => void;
  removeUpload: (id: string) => void;

  toggleFavorite: (url: string) => void;
  /** Favourite or un-favourite several at once, as a selection does. */
  setFavorites: (urls: string[], on: boolean) => void;

  addRun: (run: Run) => void;
  patchRun: (id: string, patch: Partial<Run>) => void;
  removeRun: (id: string) => void;
  /** Fill the studio with sample media, and take it back out again. */
  loadDemo: () => void;
  clearDemo: () => void;
}

/** The field a model's prompt is written in, for the values it has now. */
function promptKey(model: ModelDef, values: Values): string | undefined {
  return activeFields(model, values).find((f) => f.placement === "prompt")?.key;
}

/** Put the category's prompt into a model's prompt field. */
function withPrompt(model: ModelDef, values: Values, prompt: string | undefined): Values {
  if (prompt === undefined) return values;
  const key = promptKey(model, values);
  if (!key || values[key] === prompt) return values;
  return { ...values, [key]: prompt };
}

/** Remember the prompt these values hold as their category's prompt. */
function sharedPrompt(state: StudioState, model: ModelDef, values: Values) {
  const key = promptKey(model, values);
  const prompt = key ? values[key] : undefined;
  if (typeof prompt !== "string" || state.promptByCategory[model.category] === prompt) return {};
  return { promptByCategory: { ...state.promptByCategory, [model.category]: prompt } };
}

/** Where a model takes reference pictures, for these values (never a mask). */
function refField(model: ModelDef, values: Values) {
  return activeFields(model, values).find(
    (f) => f.placement === "input" && (f.accept ?? "image") === "image" && !/mask/.test(f.key),
  );
}

function refsIn(values: Values, key: string): string[] {
  const value = values[key];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && !!v);
  return typeof value === "string" && value ? [value] : [];
}

/**
 * The same values in another mode: keys the mode does not use go, a value
 * it does not offer falls back to its default, and its defaults fill in.
 */
function inMode(model: ModelDef, current: Values, mode: string): Values {
  const next: Values = { ...current, __mode: mode };
  // A key can be declared by several fields (same option, different bounds
  // per mode), so decide per key — not per field — whether it survives.
  const active = model.fields.filter((f) => !f.when || f.when(next));
  const activeKeys = new Set(active.map((f) => f.key));
  for (const field of model.fields) {
    if (!activeKeys.has(field.key)) delete next[field.key];
  }
  for (const field of active) {
    const val = next[field.key];
    if (val !== undefined && val !== "" && field.choices && !field.choices.some((c) => c.value === String(val))) {
      delete next[field.key];
    }
    if (next[field.key] === undefined && field.default !== undefined) next[field.key] = field.default;
  }
  return next;
}

/**
 * Put the category's reference pictures into a model. When they exist and
 * the model's current mode takes none, `switchMode` lets it move to the
 * first mode that does (Nano Banana from Generate to Edit), so the pictures
 * are there to see rather than silently left behind.
 */
function withRefs(model: ModelDef, values: Values, refs: string[] | undefined, switchMode: boolean): Values {
  if (refs === undefined) return values;
  let next = values;
  let field = refField(model, next);
  if (!field && switchMode && refs.length > 0) {
    const mode = model.modes?.find((m) => refField(model, { ...values, __mode: m.id }));
    if (mode) {
      next = inMode(model, values, mode.id);
      field = refField(model, next);
    }
  }
  if (!field) return next;
  const value = field.kind === "images" ? refs.slice(0, field.maxItems ?? refs.length) : refs[0];
  const same = JSON.stringify(next[field.key] ?? (field.kind === "images" ? [] : undefined)) === JSON.stringify(value);
  return same ? next : { ...next, [field.key]: value };
}

/**
 * Remember the reference pictures these values hold as their category's.
 * `whole` is for values that stand for the entire bar (a Recreate): there a
 * mode without pictures means the category has none, rather than leaving
 * the last ones to turn up again on the next model.
 */
function sharedRefs(state: StudioState, model: ModelDef, values: Values, whole = false) {
  const field = refField(model, values);
  if (!field && !whole) return {};
  const refs = field ? refsIn(values, field.key) : [];
  if (JSON.stringify(state.refsByCategory[model.category] ?? []) === JSON.stringify(refs)) return {};
  return { refsByCategory: { ...state.refsByCategory, [model.category]: refs } };
}

function valuesFor(state: StudioState, id: string): Values {
  const existing = state.valuesByModel[id];
  if (existing) return existing;
  const model = getModel(id);
  return model ? defaultValues(model) : {};
}

/** Where the studio keeps everything in this browser: key, gallery, settings. */
const STORE_KEY = "zyns";
/** The name it had while the app was called KIE Studio. */
const OLD_STORE_KEY = "kie-studio";

// Carry a browser's saved studio over from the old name before the store
// reads it, so renaming the key loses nobody's API key or gallery. Runs
// once: afterwards the old entry is gone. The old entry goes first, since a
// big gallery held twice could overflow the browser's storage allowance;
// if the copy still fails, it is put back and read from next time.
if (typeof window !== "undefined") {
  let old: string | null = null;
  try {
    old = localStorage.getItem(OLD_STORE_KEY);
    if (old !== null) {
      localStorage.removeItem(OLD_STORE_KEY);
      if (localStorage.getItem(STORE_KEY) === null) localStorage.setItem(STORE_KEY, old);
    }
  } catch {
    try {
      if (old !== null && localStorage.getItem(STORE_KEY) === null) localStorage.setItem(OLD_STORE_KEY, old);
    } catch {
      // No storage at all (private mode, a preview): nothing to carry over.
    }
  }
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      theme: "dark",
      credits: null,
      category: "image",
      page: "home",
      density: 6,
      phoneGrid: true,
      modelId: "",
      draft: "",
      batch: 1,
      selecting: 0,
      composer: false,
      selectMode: false,
      createOpen: false,
      modelByCategory: {},
      promptByCategory: {},
      refsByCategory: {},
      valuesByModel: {},
      runs: [],
      uploads: [],
      favorites: [],
      settingsOpen: false,
      pickerOpen: false,
      pickerTab: "all",
      pickerLocked: false,
      hydrated: false,

      // Samples are for looking round without a key. Once one is connected
      // they would only sit among the real work, with no button left to take
      // them out, so connecting clears them.
      setApiKey: (apiKey) =>
        set((state) =>
          apiKey
            ? {
                apiKey,
                credits: null,
                runs: state.runs.filter((r) => !r.id.startsWith(DEMO_PREFIX)),
                uploads: state.uploads.filter((u) => !u.id.startsWith(DEMO_PREFIX)),
              }
            : { apiKey, credits: null },
        ),
      setTheme: (theme) => set({ theme }),
      setCredits: (credits) => set({ credits }),
      setCategory: (category) => set({ category }),

      /**
       * A page carries its own model: stepping onto Videos brings back the
       * video model you last used there rather than whatever ran last.
       */
      setDensity: (density) => set({ density }),
      setPhoneGrid: (phoneGrid) => set({ phoneGrid }),
      setPage: (page) =>
        set((state) => {
          if (page === "assets" || page === "favorites" || page === "home") return { page, selectMode: false };
          // A page remembers the model it was last used with. It does not
          // invent one: until you choose, the bar says Choose model.
          const id = state.modelByCategory[page] ?? "";
          const model = getModel(id);
          if (!id || !model) return { page, category: page, modelId: "", selectMode: false };
          return {
            page,
            selectMode: false,
            category: page,
            modelId: id,
            valuesByModel: {
              ...state.valuesByModel,
              [id]: withRefs(
                model,
                withPrompt(model, valuesFor(state, id), state.promptByCategory[model.category]),
                state.refsByCategory[model.category],
                true,
              ),
            },
          };
        }),

      selectModel: (id) => {
        const model = getModel(id);
        if (!model) return;
        set((state) => {
          // The model takes its category's prompt: whatever was last written
          // in any model of the same kind. Text typed before a model was
          // chosen is newer than that, so it goes in instead.
          const draft = state.draft.trim() && promptKey(model, valuesFor(state, id)) ? state.draft : undefined;
          const values = withRefs(
            model,
            withPrompt(model, valuesFor(state, id), draft ?? state.promptByCategory[model.category]),
            state.refsByCategory[model.category],
            true,
          );
          return {
            modelId: id,
            category: model.category,
            page: state.page === "home" ? state.page : model.category,
            modelByCategory: { ...state.modelByCategory, [model.category]: id },
            pickerOpen: false,
            draft: draft === undefined ? state.draft : "",
            valuesByModel: { ...state.valuesByModel, [id]: values },
            ...sharedPrompt(state, model, values),
          };
        });
      },

      setDraft: (draft) => set({ draft }),

      // Four is the ceiling everywhere it appears, and it is a client-side
      // count: the run is simply sent that many times.
      setBatch: (batch) => set({ batch: Math.min(4, Math.max(1, Math.round(batch))) }),

      // Not persisted: a picked tile is a thing about this visit, not about
      // the studio, and a reload should never come back mid-selection.
      setSelecting: (selecting) => set({ selecting }),
      setComposer: (composer) => set({ composer }),
      setSelectMode: (selectMode) => set({ selectMode }),
      setCreateOpen: (createOpen) => set({ createOpen }),

      setValue: (key, value) =>
        set((state) => {
          const current = valuesFor(state, state.modelId);
          const next = { ...current, [key]: value };
          const model = getModel(state.modelId);
          // Taking a picture out moves the prompt's `@Image N` with the rest.
          const prompt = model && promptKey(model, next);
          if (model && prompt && typeof next[prompt] === "string" && imageFields(model, next).some((f) => f.key === key)) {
            next[prompt] = followRemoval(next[prompt] as string, imageRefs(model, current), imageRefs(model, next));
          }
          return {
            valuesByModel: { ...state.valuesByModel, [state.modelId]: next },
            ...(model ? sharedPrompt(state, model, next) : {}),
            ...(model && key === refField(model, next)?.key ? sharedRefs(state, model, next) : {}),
          };
        }),

      setValues: (values) =>
        set((state) => {
          const model = getModel(state.modelId);
          return {
            valuesByModel: { ...state.valuesByModel, [state.modelId]: values },
            ...(model ? sharedPrompt(state, model, values) : {}),
            ...(model ? sharedRefs(state, model, values, true) : {}),
          };
        }),

      clearInputs: (modelId) =>
        set((state) => {
          const model = getModel(modelId);
          const current = state.valuesByModel[modelId];
          if (!model || !current) return {};
          const next = { ...current };
          const defaults = defaultValues(model);
          for (const field of model.fields) {
            if (field.placement === "input") next[field.key] = defaults[field.key];
          }
          // The sent pictures leave the whole category, not just this model.
          return {
            valuesByModel: { ...state.valuesByModel, [modelId]: next },
            refsByCategory: { ...state.refsByCategory, [model.category]: [] },
          };
        }),

      resetValues: () =>
        set((state) => {
          const model = getModel(state.modelId);
          if (!model) return {};
          return {
            valuesByModel: {
              ...state.valuesByModel,
              // The settings go back to their defaults; the prompt is not a
              // setting and stays.
              [state.modelId]: withRefs(
                model,
                withPrompt(model, defaultValues(model), state.promptByCategory[model.category]),
                state.refsByCategory[model.category],
                false,
              ),
            },
          };
        }),

      /**
       * Switching mode keeps shared values (prompt, ratio…) but drops defaults
       * belonging to the mode you left, so a stale first-frame URL can never
       * ride along into a text-to-video run.
       */
      setMode: (mode) =>
        set((state) => {
          const model = getModel(state.modelId);
          if (!model) return {};
          const next = inMode(model, valuesFor(state, state.modelId), mode);
          return {
            valuesByModel: {
              ...state.valuesByModel,
              // A mode that takes pictures picks up the category's.
              [state.modelId]: withRefs(
                model,
                withPrompt(model, next, state.promptByCategory[model.category]),
                state.refsByCategory[model.category],
                false,
              ),
            },
          };
        }),

      toggleSettings: (open) =>
        set((state) => ({ settingsOpen: open ?? !state.settingsOpen })),
      togglePicker: (open, tab, locked) =>
        set((state) => ({
          pickerOpen: open ?? !state.pickerOpen,
          pickerTab: tab ?? state.pickerTab,
          pickerLocked: locked ?? false,
        })),

      addUpload: (upload) =>
        set((state) => ({
          uploads: [upload, ...state.uploads.filter((u) => u.url !== upload.url)].slice(0, 200),
        })),
      removeUpload: (id) =>
        set((state) => ({ uploads: state.uploads.filter((u) => u.id !== id) })),

      toggleFavorite: (url) =>
        set((state) => ({
          favorites: state.favorites.includes(url)
            ? state.favorites.filter((u) => u !== url)
            : [url, ...state.favorites],
        })),
      setFavorites: (urls, on) =>
        set((state) => {
          const rest = state.favorites.filter((u) => !urls.includes(u));
          return { favorites: on ? [...urls, ...rest] : rest };
        }),

      addRun: (run) => set((state) => ({ runs: [run, ...state.runs].slice(0, 200) })),
      patchRun: (id, patch) =>
        set((state) => ({
          runs: state.runs.map((run) => (run.id === id ? { ...run, ...patch } : run)),
        })),
      removeRun: (id) => set((state) => ({ runs: state.runs.filter((run) => run.id !== id) })),
      loadDemo: () =>
        set((state) => ({
          runs: [...demoRuns(), ...state.runs.filter((r) => !r.id.startsWith(DEMO_PREFIX))],
          uploads: [...demoUploads(), ...state.uploads.filter((u) => !u.id.startsWith(DEMO_PREFIX))],
        })),
      clearDemo: () =>
        set((state) => ({
          runs: state.runs.filter((r) => !r.id.startsWith(DEMO_PREFIX)),
          uploads: state.uploads.filter((u) => !u.id.startsWith(DEMO_PREFIX)),
        })),
    }),
    {
      // The localStorage key. Renaming it again needs the same carry-over as
      // OLD_STORE_KEY above, or every browser would lose its key and gallery.
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        theme: state.theme,
        category: state.category,
        page: state.page,
        density: state.density,
        phoneGrid: state.phoneGrid,
        modelId: state.modelId,
        draft: state.draft,
        batch: state.batch,
        modelByCategory: state.modelByCategory,
        promptByCategory: state.promptByCategory,
        refsByCategory: state.refsByCategory,
        valuesByModel: state.valuesByModel,
        runs: state.runs,
        uploads: state.uploads,
        favorites: state.favorites,
      }),
    },
  ),
);

// `persist` only wires itself up where a storage exists, so the server render
// must not reach for it.
if (typeof window !== "undefined") {
  // A restored page and a restored model are two separate stored values, so
  // they can disagree — reopening on Video with an image model selected would
  // leave the prompt bar offering the wrong thing. setPage reconciles them.
  const settle = () => {
    const state = useStudio.getState();
    useStudio.setState({ hydrated: true });
    // A run still "Submitting" when the page opens was being sent by a page
    // that has since closed or reloaded: nothing here is sending it, and it
    // never got a task id to poll, so it would sit there for good. Say what
    // happened instead; KIE may or may not have received it.
    const stranded = state.runs.filter((run) => run.state === "queued" && !run.taskId);
    for (const run of stranded) {
      state.patchRun(run.id, {
        state: "failed",
        error: "Interrupted: the page closed before KIE confirmed this run.",
      });
    }
    // Runs saved before task reports stopped echoing the request can hold
    // their own reference images as results, ahead of the real output.
    for (const run of state.runs) {
      // Errors saved before KIE's Chinese messages were put into English.
      if (hasChinese(run.error)) state.patchRun(run.id, { error: englishError(run.error) });
      if (run.urls.length === 0) continue;
      const kept = withoutInputs(run.urls, run.values);
      if (kept.length > 0 && kept.length < run.urls.length) state.patchRun(run.id, { urls: kept });
    }
    const page = state.page;
    if (page === "assets" || page === "favorites" || page === "home") return;
    const model = getModel(state.modelId);
    if (model ? model.category !== page : state.modelId !== "") state.setPage(page);
  };
  useStudio.persist?.onFinishHydration(settle);
  if (useStudio.persist?.hasHydrated()) settle();
}

/**
 * Default value objects are cached by model id: `useValues` runs on every
 * store read, and handing back a fresh object each time would loop the
 * `useSyncExternalStore` snapshot check.
 */
const defaultsCache = new Map<string, Values>();

function cachedDefaults(id: string): Values {
  let cached = defaultsCache.get(id);
  if (!cached) {
    const model = getModel(id);
    cached = model ? defaultValues(model) : {};
    defaultsCache.set(id, cached);
  }
  return cached;
}

/** Current model's values, always defined. */
export function useValues(): Values {
  return useStudio((state) => state.valuesByModel[state.modelId] ?? cachedDefaults(state.modelId));
}

/**
 * Opens the model picker on the page you are on: a page that makes images
 * lists image models and nothing else. Home belongs to no one kind of work,
 * so from there the whole catalogue is listed, grouped by kind.
 */
export function openPickerHere() {
  const { page, togglePicker } = useStudio.getState();
  const scoped = page !== "home" && page !== "assets" && page !== "favorites";
  togglePicker(true, scoped ? page : "all", scoped);
}

export function useModel() {
  return useStudio((state) => getModel(state.modelId));
}
