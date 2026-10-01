import { NextResponse } from "next/server";
import { loadCatalog } from "@/lib/higgsfield/catalogServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Higgsfield's model catalogue (schemas, form hints, previews, prices),
 * normalised for the studio. Cached at the edge for an hour and served stale
 * for a day while it refreshes; the shipped snapshot stands in when
 * dash.higgsfield.ai cannot be read.
 */
export async function GET() {
  const { catalog, live } = await loadCatalog();
  return NextResponse.json(catalog, {
    headers: {
      // A fallback is only held briefly, so the live catalogue returns soon.
      "Cache-Control": live
        ? "public, s-maxage=3600, stale-while-revalidate=86400"
        : "public, s-maxage=300, stale-while-revalidate=3600",
      "X-Catalog-Source": live ? "live" : "snapshot",
    },
  });
}
