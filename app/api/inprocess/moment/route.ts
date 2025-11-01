import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const contractAddress = searchParams.get("contractAddress")
    const tokenId = searchParams.get("tokenId")
    const chainId = searchParams.get("chainId") || "8453"

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "contractAddress and tokenId are required" }, { status: 400 })
    }

    console.log("[v0] Moment API - Fetching moment:", { contractAddress, tokenId, chainId })

    const apiKey = process.env.INPROCESS_API_KEY

    if (!apiKey) {
      console.log("[v0] ❌ INPROCESS_API_KEY environment variable is not set")
      return NextResponse.json({ error: "INPROCESS_API_KEY environment variable is not configured" }, { status: 500 })
    }

    const indexResponse = await fetch("https://inprocess.fun/api/moment/index", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        address: contractAddress,
        tokenId: Number.parseInt(tokenId),
        chainId: Number.parseInt(chainId),
      }),
    })

    console.log("[v0] Moment API - Index response status:", indexResponse.status)

    if (!indexResponse.ok) {
      const errorText = await indexResponse.text()
      console.error("[v0] Moment API - Index error response:", errorText)
      return NextResponse.json(
        { error: `Failed to fetch moment: ${indexResponse.status}` },
        { status: indexResponse.status },
      )
    }

    const momentData = await indexResponse.json()
    console.log("[v0] Moment API - Success! Moment data:", JSON.stringify(momentData, null, 2))

    return NextResponse.json(momentData)
  } catch (error) {
    console.error("[v0] Moment API - Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
