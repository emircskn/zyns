"use client";

import { Range } from "@/components/Range";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Icon } from "@/components/Icon";
import { mediaSrc } from "@/lib/storage/client";

interface Stroke {
  size: number;
  points: Array<[number, number]>;
}

/** What the page asks of the pad: the painted area as a black-and-white picture (white = change), or nothing when nothing is painted. */
export interface DrawApi {
  mask: () => Promise<Blob | null>;
}

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.lineWidth = s.size;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    // A single tap is a dot.
    if (s.points.length === 1) ctx.arc(s.points[0][0], s.points[0][1], s.size / 2, 0, Math.PI * 2);
    s.points.length === 1 ? ctx.fill() : ctx.stroke();
  }
}

/**
 * The picture with a brush over it, as Higgsfield's Draw: paint the part to
 * change. The strokes live in the picture's own pixels, so the mask handed
 * back is exactly its size.
 */
export function DrawPad({ src, api, onCount }: { src: string; api: MutableRefObject<DrawApi | null>; onCount: (n: number) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const size = useRef({ w: 0, h: 0 });
  const down = useRef(false);
  const [brush, setBrush] = useState(40);
  const [ready, setReady] = useState(false);

  const redraw = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    paint(ctx, strokes.current, "rgba(255, 64, 129, 0.55)");
  }, []);

  const clear = useCallback(() => {
    strokes.current = [];
    onCount(0);
    redraw();
  }, [onCount, redraw]);

  // A new picture is a new canvas: its pixels set the canvas size, the old strokes go.
  useEffect(() => {
    setReady(false);
    const img = new Image();
    img.onload = () => {
      size.current = { w: img.naturalWidth, h: img.naturalHeight };
      if (canvas.current) {
        canvas.current.width = img.naturalWidth;
        canvas.current.height = img.naturalHeight;
      }
      setBrush(Math.max(12, Math.round(Math.max(img.naturalWidth, img.naturalHeight) / 18)));
      clear();
      setReady(true);
    };
    img.src = mediaSrc(src);
  }, [src, clear]);

  useEffect(() => {
    api.current = {
      mask: async () => {
        const { w, h } = size.current;
        if (!strokes.current.length || !w) return null;
        const out = document.createElement("canvas");
        out.width = w;
        out.height = h;
        const ctx = out.getContext("2d")!;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        paint(ctx, strokes.current, "#fff");
        return new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
      },
    };
    return () => {
      api.current = null;
    };
  }, [api]);

  const at = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const box = event.currentTarget.getBoundingClientRect();
    return [((event.clientX - box.left) / box.width) * size.current.w, ((event.clientY - box.top) / box.height) * size.current.h];
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-card bg-t1/[0.05]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaSrc(src)} alt="" className="block max-h-[60dvh] max-w-full" draggable={false} />
        <canvas
          ref={canvas}
          className={`absolute inset-0 h-full w-full touch-none ${ready ? "cursor-crosshair" : ""}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            down.current = true;
            strokes.current.push({ size: brush, points: [at(e)] });
            redraw();
          }}
          onPointerMove={(e) => {
            if (!down.current) return;
            strokes.current[strokes.current.length - 1].points.push(at(e));
            redraw();
          }}
          onPointerUp={() => {
            down.current = false;
            onCount(strokes.current.length);
          }}
        />
      </div>
      <div className="flex items-center gap-3 text-[12.5px] text-t3">
        <Icon name="brush" size={15} />
        <Range min={6} max={Math.max(60, Math.round(Math.max(size.current.w, size.current.h) / 4))} value={brush} onChange={setBrush} label="Brush size" className="w-40" />
        <button
          type="button"
          onClick={() => {
            strokes.current.pop();
            onCount(strokes.current.length);
            redraw();
          }}
          className="flex items-center gap-1 rounded-chip bg-t1/[0.06] px-2.5 py-1.5 hover:bg-t1/[0.12]"
        >
          <Icon name="undo" size={14} /> Undo
        </button>
        <button type="button" onClick={clear} className="rounded-chip bg-t1/[0.06] px-2.5 py-1.5 hover:bg-t1/[0.12]">
          Clear
        </button>
      </div>
    </div>
  );
}
