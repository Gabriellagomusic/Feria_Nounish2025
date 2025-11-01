import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get("address")
    const tokenId = searchParams.get("tokenId") || "1"
    const chainId = searchParams.get("chainId") || "8453"

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    console.log("[v0] Moment API - Fetching moment:", { address, tokenId, chainId })

    // Use the index endpoint to fetch/index the moment
    const response = await fetch("https://inprocess.fun/api/moment/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        tokenId: Number.parseInt(tokenId),
        chainId: Number.parseInt(chainId),
      }),
    })

    console.log("[v0] Moment API - Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Moment API - Error response:", errorText)
      return NextResponse.json({ error: `Inprocess API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Moment API - Success! Moment admin:", data.moment?.admin)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Moment API - Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
