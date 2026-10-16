import { NextResponse } from "next/server";

/**
 * Server-side geocoding so the provider token never reaches the browser.
 * Uses the Mapbox Geocoding API v6 when MAPBOX_ACCESS_TOKEN is set; returns
 * 501 otherwise and the branch finder falls back to text matching.
 * Queries are not logged or stored.
 */
export async function GET(request: Request) {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 200) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  url.searchParams.set("q", q);
  url.searchParams.set("country", "ca");
  url.searchParams.set("limit", "1");
  url.searchParams.set("language", "fr");
  url.searchParams.set("access_token", token);

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { features?: { geometry?: { coordinates?: [number, number] } }[] };
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords) return NextResponse.json({ found: false });
    return NextResponse.json({ lat: coords[1], lng: coords[0] }, { headers: { "cache-control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }
}
