"use client";

/**
 * Higgsfield takes sound only as WAV. An MP3 or M4A is decoded by the
 * browser and written out as 16-bit PCM WAV before it is sent there; nothing
 * leaves the page to do it.
 */

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const view = new DataView(new ArrayBuffer(44 + bytes));
  const text = (offset: number, s: string) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, bytes, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

export function isWav(type: string): boolean {
  return /^audio\/(x-)?wav$/i.test(type);
}

/** The same sound as a WAV file; a WAV is returned untouched. */
export async function toWav(file: Blob, name = "audio"): Promise<File> {
  if (isWav(file.type)) return file instanceof File ? file : new File([file], `${name}.wav`, { type: "audio/wav" });
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    return new File([encodeWav(decoded)], `${name.replace(/\.[a-z0-9]+$/i, "")}.wav`, { type: "audio/wav" });
  } catch {
    throw new Error("This sound could not be read to turn it into WAV, which Higgsfield needs.");
  } finally {
    void context.close();
  }
}
