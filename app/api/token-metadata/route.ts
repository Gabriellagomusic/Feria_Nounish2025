import { type NextRequest, NextResponse } from "next/server"
import { normalizeUri, normalizeAnyNestedUri } from "@/lib/normalizeUri"
import { fetchJsonWithRetries } from "@/lib/fetchJsonWithRetries"

export async function GET(req: NextRequest) {
  const uri = req.nextUrl.searchParams.get("uri") || ""

  console.log("[v0] Token metadata API called with URI:", uri)

  const norm = normalizeUri(uri)

  try {
    if (norm.kind === "data" && norm.dataJson) {
      const json = norm.dataJson
      if (json.image) json.image = normalizeAnyNestedUri(json.image)
      if (json.animation_url) json.animation_url = normalizeAnyNestedUri(json.animation_url)
      return NextResponse.json({ ok: true, metadata: json })
    }

    if (norm.kind !== "http" || norm.urls.length === 0) {
      return NextResponse.json({ ok: false, error: "Invalid URI" }, { status: 400 })
    }

    console.log("[v0] Trying gateways:", norm.urls)

    const result = await fetchJsonWithRetries(norm.urls)

    if (!result.ok) {
      console.log("[v0] All gateways failed for URI:", uri)
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 })
    }

    console.log("[v0] Successfully fetched metadata from:", result.usedUrl)

    const meta = result.json
    if (meta?.image) meta.image = normalizeAnyNestedUri(meta.image)
    if (meta?.animation_url) meta.animation_url = normalizeAnyNestedUri(meta.animation_url)

    return NextResponse.json({ ok: true, metadata: meta, source: result.usedUrl })
  } catch (e: any) {
    console.error("[v0] Token metadata API error:", e)
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 })
  }
}
