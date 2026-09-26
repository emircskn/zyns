/**
 * What a finished run leaves behind besides its files, for later runs to
 * point at: a song's separate tracks, or a character or voice made to be
 * reused.
 */
export interface Track {
  id: string;
  title?: string;
  image?: string;
  audio?: string;
}

export interface Made {
  kind: "character" | "voice";
  id: string;
  name?: string;
  image?: string;
}

const str = (value: unknown) => (typeof value === "string" && value ? value : undefined);

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Suno reports each track as an object with its own `id` next to its audio
 * (camelCase when polled, snake_case in callbacks); take either.
 */
export function collectTracks(node: unknown, out: Track[] = [], depth = 0): Track[] {
  if (depth > 8 || node === null || node === undefined) return out;
  const value = parseMaybeJson(node);
  if (Array.isArray(value)) {
    for (const item of value) collectTracks(item, out, depth + 1);
  } else if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const id = str(obj.id);
    const audio = str(obj.audioUrl) ?? str(obj.audio_url) ?? str(obj.streamAudioUrl) ?? str(obj.stream_audio_url);
    if (id && audio && !out.some((t) => t.id === id)) {
      out.push({ id, audio, title: str(obj.title), image: str(obj.imageUrl) ?? str(obj.image_url) });
    }
    for (const v of Object.values(obj)) collectTracks(v, out, depth + 1);
  }
  return out;
}

/** A character or voice that KIE made on the spot, instead of a task. */
export function madeFrom(data: unknown): Made | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  const character = str(d.characterId) ?? str(d.character_id);
  if (character) {
    return { kind: "character", id: character, name: str(d.characterName), image: str(d.imageUrl) ?? str(d.bodyImageUrl) };
  }
  const voice = str(d.kieAudioId) ?? str(d.audioId) ?? str(d.audio_id);
  if (voice) return { kind: "voice", id: voice, name: str(d.name) };
  return undefined;
}
