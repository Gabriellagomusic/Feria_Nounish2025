import { type NextRequest, NextResponse } from "next/server"

const cache = new Map<string, { name: string | null; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  const normalizedAddress = address.toLowerCase()

  // Check cache first
  const cached = cache.get(normalizedAddress)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ name: cached.name })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

    const response = await fetch(`https://resolver.base.org/v1/name/${normalizedAddress}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      cache.set(normalizedAddress, { name: null, timestamp: Date.now() })
      return NextResponse.json({ name: null }, { status: 200 })
    }

    // Check content-type to avoid parsing HTML as JSON
    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.log("[v0] Basename resolver returned non-JSON response")
      cache.set(normalizedAddress, { name: null, timestamp: Date.now() })
      return NextResponse.json({ name: null }, { status: 200 })
    }

    const text = await response.text()

    // Try to parse as JSON safely
    let data
    try {
      data = JSON.parse(text)
    } catch {
      console.log("[v0] Basename resolver returned invalid JSON")
      cache.set(normalizedAddress, { name: null, timestamp: Date.now() })
      return NextResponse.json({ name: null }, { status: 200 })
    }

    const name = data.name || null
    cache.set(normalizedAddress, { name, timestamp: Date.now() })
    return NextResponse.json({ name })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("[v0] Basename resolver timeout")
    } else {
      console.error("[v0] Error fetching Basename:", error)
    }
    // Don't cache errors - allow retry
    return NextResponse.json({ name: null }, { status: 200 })
  }
}
