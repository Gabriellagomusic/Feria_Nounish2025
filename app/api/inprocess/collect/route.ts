import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, tokenId, amount, comment } = body

    if (!contractAddress || !tokenId || !amount) {
      return NextResponse.json({ error: "Missing required fields: contractAddress, tokenId, amount" }, { status: 400 })
    }

    const apiKey = process.env.INPROCESS_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "INPROCESS_API_KEY environment variable is not configured. Please add it in the Vars section." },
        { status: 500 },
      )
    }

    console.log("[v0] Calling InProcess API with contract:", contractAddress, "tokenId:", tokenId, "amount:", amount)

    // Call the InProcess API to collect the moment
    const response = await fetch("https://inprocess.fun/api/moment/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        moment: {
          contractAddress,
          tokenId: tokenId.toString(),
        },
        amount,
        comment: comment || "Collected via Feria Nounish!",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] InProcess API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to collect moment via InProcess API",
          details: errorData,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] InProcess API success:", data)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error in collect API route:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
