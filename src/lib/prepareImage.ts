"use client";

/**
 * Makes a picture safe to hand to any model before it is uploaded.
 *
 * Model hosts fetch a reference by its URL and refuse anything they cannot
 * read as PNG, JPEG or WebP ("Invalid image file or unsupported format").
 * A phone does not always hand over what it says: an iPhone can give HEIC,
 * or a file with no type at all, which the upload host then serves as a
 * plain download. So the file is judged by its own bytes, not its name:
 *
 * - PNG, JPEG or WebP of a sensible size goes up untouched, just labelled
 *   with its real type and a plain file name the URL can carry;
 * - anything else the browser can draw (HEIC, AVIF, GIF, BMP…) is redrawn
 *   as a JPEG, and so is a picture too big for the models (over 4096 px on
 *   a side or 15 MB), scaled down to fit.
 *
 * If the browser cannot draw it either, the file goes up as it came.
 */
const MAX_SIDE = 4096;
const MAX_BYTES = 15 * 1024 * 1024;

type Kind = "jpeg" | "png" | "webp" | "other";

async function sniff(file: File): Promise<Kind> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...head.slice(from, to));
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  if (head[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return "other";
}

/** A name the upload host can put in a URL: ASCII, no spaces, the right extension. */
function plainName(name: string, ext: string): string {
  const base = name
    .replace(/\.[^.]*$/, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "image"}.${ext}`;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    // Safari decodes some formats (HEIC) only through an <img>.
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, done: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

export async function prepareImage(file: File): Promise<File> {
  const kind = await sniff(file).catch(() => "other" as Kind);
  const picture = await decode(file);
  if (!picture) return file;
  try {
    const big = Math.max(picture.width, picture.height) > MAX_SIDE || file.size > MAX_BYTES;
    if (kind !== "other" && !big) {
      const ext = kind === "jpeg" ? "jpg" : kind;
      return new File([file], plainName(file.name, ext), { type: `image/${kind}`, lastModified: file.lastModified });
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(picture.width, picture.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(picture.width * scale));
    canvas.height = Math.max(1, Math.round(picture.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    // A PNG keeps its transparency; everything else becomes a JPEG.
    const png = kind === "png";
    if (!png) {
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(picture.source, 0, 0, canvas.width, canvas.height);
    const type = png ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) return file;
    return new File([blob], plainName(file.name, png ? "png" : "jpg"), { type, lastModified: file.lastModified });
  } finally {
    picture.done();
  }
}
