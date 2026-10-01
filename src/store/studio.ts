"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LibraryElement } from "@/lib/elements";
import { DEMO_PREFIX, demoRuns, demoUploads } from "@/lib/demo";
import { withoutInputs } from "@/lib/runInputs";
import { followRemoval, imageFields, imageRefs } from "@/lib/mentions";
import type { Made, Track } from "@/lib/results";
import { englishError, hasChinese } from "@/lib/kie/errors";
import {
  TIER_KEY,
  activeFields,
  defaultValues,
  getModel,
  modelsFor,
  providerOf,
  type Category,
  hasPicture,
  type ModelDef,
  type Provider,
  type Values,
} from "@/lib/registry";

/**
 * Where a page's last model is remembered. Each provider keeps its own, so
 * switching back finds the KIE model you left, and the Higgsfield one too.
 * KIE's keys are the bare category, as they were before Higgsfield came in.
 */
export function memoryKey(provider: Provider, category: Category): string {
  return provider === "higgsfield" ? `hf-${category}` : category;
}

/** The inputs a sent run takes with it: its reference files. */
const SENT_KINDS = new Set(["images", "media", "clips"]);

/** The key for the provider in use: KIE's, or Higgsfield's "ID:secret". */
export function activeKey(state: { provider: Provider; apiKey: string; hfKey: string }): string {
  return state.provider === "higgsfield" ? state.hfKey : state.apiKey;
}

/** The key a run's own provider needs, for following it up. */
export function keyFor(state: { apiKey: string; hfKey: string }, provider: Provider | undefined): string {
  return provider === "higgsfield" ? state.hfKey : state.apiKey;
}

export interface Run {
  id: string;
  taskId?: string;
  modelId: string;
  modelName: string;
  mode?: string;
  /** KIE only: which status endpoint reports on the task. */
  poll?: string;
  /** Whose task this is, and so whose key follows it up. KIE when left out. */
  provider?: Provider;
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
  /** Higgsfield: where to follow the request up and cancel it, as Higgsfield gave them. */
  statusUrl?: string;
  cancelUrl?: string;
  /** Higgsfield: sent with the submission, so sending it again cannot start a second request. */
  idempotencyKey?: string;
  /** Higgsfield: what is still to be sent while the run waits its turn; dropped once sent. */
  request?: { endpoint: string; payload: unknown };
  /** Higgsfield: waiting because the account already has as many requests running as it may. */
  held?: boolean;
  /** Addresses sent in place of kept media, so a result echoing one is not taken for output. */
  sent?: string[];
}

/** A file kept in the studio's storage (Cloudflare R2), read at `/api/storage/file/<key>`. */
export interface StoredCopy {
  key: string;
  kind: "image" | "video" | "audio";
  at: number;
}

/** A copy of a kept file on one service, good until `expiresAt`. */
export interface RemoteUrl {
  url: string;
  expiresAt?: number;
}
export type RemoteUrls = Partial<Record<Provider, RemoteUrl>>;

export type Theme = "dark" | "light";

/** Which page is showing: one per category, plus the browsing pages. */
export type Page = Category | "assets" | "favorites" | "elements" | "home";

/** The pages that keep things rather than make them. */
export function isLibraryPage(page: Page): page is "assets" | "favorites" | "elements" {
  return page === "assets" || page === "favorites" || page === "elements";
}

/** A file the studio uploaded to KIE, kept so it can be reused as reference. */
export interface Upload {
  id: string;
  url: string;
  kind: "image" | "video" | "audio";
  name?: string;
  createdAt: number;
}

interface StudioState {
  /** The KIE key. */
  apiKey: string;
  /** The Higgsfield key, as "KEY_ID:KEY_SECRET". */
  hfKey: string;
  /** Which service the studio makes things with: its models, its key. */
  provider: Provider;
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
  /** The model last used on each page, per provider (see `memoryKey`). */
  modelByCategory: Partial<Record<string, string>>;
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
  /** Lasting copies in the studio's own storage, by the URL they were copied from. */
  copies: Record<string, StoredCopy>;
  /** The Elements library, newest first. */
  elements: LibraryElement[];
  /** The element being made or edited, if the editor is open: an id to edit, or pictures to start from. */
  elementEditor: { id?: string; images?: string[] } | null;
  /** Where each kept file was last handed to a service, by its storage key. */
  remotes: Record<string, RemoteUrls>;
  settingsOpen: boolean;
  pickerOpen: boolean;
  pickerTab: Category | "all";
  /** Opened from a category page: that page's models and nothing else. */
  pickerLocked: boolean;
  hydrated: boolean;

  setApiKey: (key: string) => void;
  setHfKey: (key: string) => void;
  setProvider: (provider: Provider) => void;
  setTheme: (theme: Theme) => void;
  setCredits: (credits: number | null) => void;
  setCategory: (category: Category) => void;
  setPage: (page: Page) => void;
  /** How many columns the galleries pack at the widest breakpoint. */
  density: number;
  setDensity: (density: number) => void;
  /** How each page lays out its history on a desktop: a wall, or a list with details. */
  views: Partial<Record<Category, "list" | "grid">>;
  setView: (category: Category, view: "list" | "grid") => void;
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

  setCopy: (source: string, copy: StoredCopy) => void;
  saveElement: (element: LibraryElement) => void;
  removeElement: (id: string) => void;
  openElementEditor: (editor: { id?: string; images?: string[] } | null) => void;
  setRemote: (key: string, provider: Provider, remote: RemoteUrl) => void;

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
    (f) => f.placement === "input" && (f.kind === "images" || f.kind === "media") && (f.accept ?? "image") === "image" && !/mask/.test(f.key),
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
 * Where a model folds "from text" and "from a picture" into one tab, the mode
 * follows the slot: a picture in it means the image mode, an empty one the
 * text mode. Moving goes through inMode, so each side's own options (an Auto
 * ratio that only exists with a picture) come and go with it.
 */
function settleMode(model: ModelDef, values: Values): Values {
  const auto = model.autoMode;
  if (!auto || (values.__mode !== auto.text && values.__mode !== auto.image)) return values;
  const mode = hasPicture(values[auto.field]) ? auto.image : auto.text;
  return mode === values.__mode ? values : inMode(model, values, mode);
}

/**
 * Put the category's reference pictures into a model. When they exist and
 * the model's current mode takes none, `switchMode` lets it move to the
 * first mode that does (Nano Banana from Generate to Edit), so the pictures
 * are there to see rather than silently left behind.
 */
function withRefs(model: ModelDef, values: Values, refs: string[] | undefined, switchMode: boolean): Values {
  if (refs === undefined) return settleMode(model, values);
  let next = values;
  let field = refField(model, next);
  if (!field && switchMode && refs.length > 0) {
    const mode = model.modes?.find((m) => refField(model, { ...values, __mode: m.id }));
    if (mode) {
      next = inMode(model, values, mode.id);
      field = refField(model, next);
    }
  }
  if (!field) return settleMode(model, next);
  const value = field.kind === "images" ? refs.slice(0, field.maxItems ?? refs.length) : refs[0];
  const same = JSON.stringify(next[field.key] ?? (field.kind === "images" ? [] : undefined)) === JSON.stringify(value);
  return settleMode(model, same ? next : { ...next, [field.key]: value });
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
      hfKey: "",
      provider: "kie",
      theme: "dark",
      credits: null,
      category: "image",
      page: "home",
      density: 6,
      views: {},
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
      copies: {},
      elements: [],
      elementEditor: null,
      remotes: {},
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
      setHfKey: (hfKey) =>
        set((state) =>
          hfKey
            ? {
                hfKey,
                runs: state.runs.filter((r) => !r.id.startsWith(DEMO_PREFIX)),
                uploads: state.uploads.filter((u) => !u.id.startsWith(DEMO_PREFIX)),
              }
            : { hfKey },
        ),

      /**
       * Switching service swaps the catalogue: each page comes back with the
       * model last used there on that service (or none yet), while prompts
       * and reference pictures carry across. A page the service has no
       * models for (Higgsfield has no audio) falls back to Home.
       */
      setProvider: (provider) => {
        const state = get();
        if (state.provider === provider) return;
        const page = state.page;
        const onCategory = !isLibraryPage(page) && page !== "home";
        const offered = modelsFor(provider).some((m) => m.category === (onCategory ? page : state.category));
        set({
          provider,
          modelId: state.modelByCategory[memoryKey(provider, state.category)] ?? "",
          ...(onCategory && !offered ? { page: "home" as Page } : {}),
        });
        if (onCategory && offered) get().setPage(page);
      },
      setTheme: (theme) => set({ theme }),
      setCredits: (credits) => set({ credits }),
      setCategory: (category) => set({ category }),

      /**
       * A page carries its own model: stepping onto Videos brings back the
       * video model you last used there rather than whatever ran last.
       */
      setDensity: (density) => set({ density }),
      setView: (category, view) => set((state) => ({ views: { ...state.views, [category]: view } })),
      setPhoneGrid: (phoneGrid) => set({ phoneGrid }),
      setPage: (page) =>
        set((state) => {
          if (isLibraryPage(page) || page === "home") return { page, selectMode: false };
          // A page remembers the model it was last used with. It does not
          // invent one: until you choose, the bar says Choose model.
          const id = state.modelByCategory[memoryKey(state.provider, page)] ?? "";
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
            // A model belongs to one service; choosing it (a Recreate of a
            // Higgsfield run, say) brings that service along.
            provider: providerOf(model),
            category: model.category,
            page: state.page === "home" ? state.page : model.category,
            modelByCategory: { ...state.modelByCategory, [memoryKey(providerOf(model), model.category)]: id },
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
          let next: Values = { ...current, [key]: value };
          const model = getModel(state.modelId);
          // A tier is its own endpoint with its own options (Higgsfield's
          // Kling Pro stops at 1080p where 4K goes further). Carry over what
          // still fits, and let the rest fall back to the new tier's defaults.
          if (model && key === TIER_KEY) {
            for (const field of activeFields(model, next)) {
              const val = next[field.key];
              const fits =
                val === undefined || val === "" || !field.choices || field.choices.some((c) => c.value === String(val));
              if (!fits) delete next[field.key];
              if (next[field.key] === undefined && field.default !== undefined) next[field.key] = field.default;
            }
          }
          // Taking a picture out moves the prompt's `@Image N` with the rest.
          const prompt = model && promptKey(model, next);
          if (model && prompt && typeof next[prompt] === "string" && imageFields(model, next).some((f) => f.key === key)) {
            next[prompt] = followRemoval(next[prompt] as string, imageRefs(model, current), imageRefs(model, next));
          }
          if (model) next = settleMode(model, next);
          return {
            valuesByModel: { ...state.valuesByModel, [state.modelId]: next },
            ...(model ? sharedPrompt(state, model, next) : {}),
            ...(model && key === refField(model, next)?.key ? sharedRefs(state, model, next) : {}),
          };
        }),

      setValues: (given) =>
        set((state) => {
          const model = getModel(state.modelId);
          const values = model ? settleMode(model, given) : given;
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
          // Only the files go: a dialogue's lines, a song's title or a
          // picked character sit in the bar too, and are meant to stay.
          for (const field of model.fields) {
            if (field.placement === "input" && SENT_KINDS.has(field.kind)) next[field.key] = defaults[field.key];
          }
          // The sent pictures leave the whole category, not just this model.
          return {
            valuesByModel: { ...state.valuesByModel, [modelId]: settleMode(model, next) },
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

      saveElement: (element) =>
        set((state) => ({
          elements: state.elements.some((e) => e.id === element.id)
            ? state.elements.map((e) => (e.id === element.id ? element : e))
            : [element, ...state.elements],
        })),
      removeElement: (id) => set((state) => ({ elements: state.elements.filter((e) => e.id !== id) })),
      openElementEditor: (elementEditor) => set({ elementEditor }),
      setCopy: (source, copy) => set((state) => ({ copies: { ...state.copies, [source]: copy } })),
      setRemote: (key, provider, remote) =>
        set((state) => ({ remotes: { ...state.remotes, [key]: { ...state.remotes[key], [provider]: remote } } })),

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
        hfKey: state.hfKey,
        provider: state.provider,
        theme: state.theme,
        category: state.category,
        page: state.page,
        density: state.density,
        views: state.views,
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
        copies: state.copies,
        elements: state.elements,
        remotes: state.remotes,
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
    // Saved settings from before a choice had a starting value (Gemini
    // Omni's duration, a ratio chip that only showed its name) would still
    // refuse to send or read as unset: give each the defaults it lacks.
    let filled = false;
    const valuesByModel = { ...state.valuesByModel };
    for (const [id, values] of Object.entries(valuesByModel)) {
      const model = getModel(id);
      if (!model) continue;
      // Required ones even when blank; the rest only where nothing was ever
      // stored, so an option someone cleared stays cleared.
      const missing = activeFields(model, values).filter(
        (f) =>
          f.default !== undefined &&
          (values[f.key] === undefined || (f.required && values[f.key] === "")),
      );
      if (missing.length === 0) continue;
      valuesByModel[id] = { ...values, ...Object.fromEntries(missing.map((f) => [f.key, f.default])) };
      filled = true;
    }
    useStudio.setState(filled ? { hydrated: true, valuesByModel } : { hydrated: true });
    // A run still "Submitting" when the page opens was being sent by a page
    // that has since closed or reloaded: nothing here is sending it, and it
    // never got a task id to poll, so it would sit there for good. Say what
    // happened instead; KIE may or may not have received it.
    // A Higgsfield run that still holds its request is simply sent again: its
    // idempotency key makes Higgsfield return the request it may already have.
    const stranded = state.runs.filter((run) => run.state === "queued" && !run.taskId && !run.request);
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
    if (isLibraryPage(page) || page === "home") return;
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
  const scoped = page !== "home" && !isLibraryPage(page);
  togglePicker(true, scoped ? page : "all", scoped);
}

export function useModel() {
  return useStudio((state) => getModel(state.modelId));
}
