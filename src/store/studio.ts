"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEMO_PREFIX, demoRuns, demoUploads } from "@/lib/demo";
import {
  MODELS,
  defaultValues,
  getModel,
  type Category,
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
  modelId: string;
  /** The model each category was last used with, so pages remember. */
  modelByCategory: Partial<Record<Category, string>>;
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
  setValue: (key: string, value: unknown) => void;
  setValues: (values: Values) => void;
  resetValues: () => void;
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
  clearRuns: () => void;
  /** Fill the studio with sample media, and take it back out again. */
  loadDemo: () => void;
  clearDemo: () => void;
}

function valuesFor(state: StudioState, id: string): Values {
  const existing = state.valuesByModel[id];
  if (existing) return existing;
  const model = getModel(id);
  return model ? defaultValues(model) : {};
}

export const useStudio = create<StudioState>()(
  persist(
    (set, get) => ({
      apiKey: "",
      theme: "dark",
      credits: null,
      category: "image",
      page: "home",
      density: 4,
      phoneGrid: true,
      modelId: MODELS.find((m) => m.category === "image")?.id ?? MODELS[0]?.id ?? "",
      modelByCategory: {},
      valuesByModel: {},
      runs: [],
      uploads: [],
      favorites: [],
      settingsOpen: false,
      pickerOpen: false,
      pickerTab: "all",
      pickerLocked: false,
      hydrated: false,

      setApiKey: (apiKey) => set({ apiKey, credits: null }),
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
          if (page === "assets" || page === "favorites" || page === "home") return { page };
          const id =
            state.modelByCategory[page] ?? MODELS.find((m) => m.category === page)?.id ?? state.modelId;
          return {
            page,
            category: page,
            modelId: id,
            valuesByModel: { ...state.valuesByModel, [id]: valuesFor(state, id) },
          };
        }),

      selectModel: (id) => {
        const model = getModel(id);
        if (!model) return;
        set((state) => ({
          modelId: id,
          category: model.category,
          page: model.category,
          modelByCategory: { ...state.modelByCategory, [model.category]: id },
          pickerOpen: false,
          valuesByModel: {
            ...state.valuesByModel,
            [id]: valuesFor(state, id),
          },
        }));
      },

      setValue: (key, value) =>
        set((state) => {
          const current = valuesFor(state, state.modelId);
          return {
            valuesByModel: {
              ...state.valuesByModel,
              [state.modelId]: { ...current, [key]: value },
            },
          };
        }),

      setValues: (values) =>
        set((state) => ({
          valuesByModel: { ...state.valuesByModel, [state.modelId]: values },
        })),

      resetValues: () =>
        set((state) => {
          const model = getModel(state.modelId);
          if (!model) return {};
          return {
            valuesByModel: {
              ...state.valuesByModel,
              [state.modelId]: defaultValues(model),
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
          const current = valuesFor(state, state.modelId);
          const next: Values = { ...current, __mode: mode };

          // A key can be declared by several fields (same option, different
          // bounds per mode), so decide per key — not per field — whether it
          // survives the switch, then fill defaults from the active field.
          const activeFields = model.fields.filter((f) => !f.when || f.when(next));
          const activeKeys = new Set(activeFields.map((f) => f.key));
          for (const field of model.fields) {
            if (!activeKeys.has(field.key)) delete next[field.key];
          }
          for (const field of activeFields) {
            if (next[field.key] === undefined && field.default !== undefined) {
              next[field.key] = field.default;
            }
          }
          return {
            valuesByModel: { ...state.valuesByModel, [state.modelId]: next },
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
      clearRuns: () => set({ runs: [] }),
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
      // Deliberately not renamed with the brand: this is the localStorage key,
      // and changing it would throw away everyone's saved key and gallery.
      name: "kie-studio",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        theme: state.theme,
        category: state.category,
        page: state.page,
        density: state.density,
        phoneGrid: state.phoneGrid,
        modelId: state.modelId,
        modelByCategory: state.modelByCategory,
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
    const page = state.page;
    if (page === "assets" || page === "favorites" || page === "home") return;
    if (getModel(state.modelId)?.category !== page) state.setPage(page);
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

export function useModel() {
  return useStudio((state) => getModel(state.modelId));
}
