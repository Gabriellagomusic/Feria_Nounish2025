import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Build the URL to the Inprocess API
    const inprocessUrl = new URL("https://inprocess.fun/api/timeline")

    // Forward all query parameters
    searchParams.forEach((value, key) => {
      inprocessUrl.searchParams.set(key, value)
    })

    console.log("[v0] API Proxy - Artist parameter:", searchParams.get("artist"))
    console.log("[v0] API Proxy - Fetching from Inprocess:", inprocessUrl.toString())

    // Fetch from the Inprocess API
    const response = await fetch(inprocessUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] API Proxy - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] API Proxy - Error response:", errorText)
      return NextResponse.json({ error: `Inprocess API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] API Proxy - Success! Moments count:", data.moments?.length || 0)

    if (data.moments && data.moments.length > 0) {
      console.log("[v0] API Proxy - First moment admin:", data.moments[0].admin)
      console.log("[v0] API Proxy - Requested artist:", searchParams.get("artist"))
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] API Proxy - Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
