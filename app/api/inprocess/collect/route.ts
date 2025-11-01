import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, tokenId, amount, comment } = body

    console.log("[v0] 🔍 Collect API called with body:", JSON.stringify(body, null, 2))

    if (!contractAddress || !tokenId || !amount) {
      console.log("[v0] ❌ Missing required fields")
      return NextResponse.json({ error: "Missing required fields: contractAddress, tokenId, amount" }, { status: 400 })
    }

    const apiKey = process.env.INPROCESS_API_KEY

    if (!apiKey) {
      console.log("[v0] ❌ INPROCESS_API_KEY environment variable is not set")
      return NextResponse.json(
        { error: "INPROCESS_API_KEY environment variable is not configured. Please add it in the Vars section." },
        { status: 500 },
      )
    }

    const maskedKey = apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4)
    console.log("[v0] ✅ API key found:", maskedKey)
    console.log("[v0] 📝 API key length:", apiKey.length)

    const requestBody = {
      moment: {
        contractAddress,
        tokenId: tokenId.toString(),
      },
      amount,
      comment: comment || "Collected via Feria Nounish!",
    }

    console.log("[v0] 📤 Sending request to InProcess API:")
    console.log("[v0] URL: https://inprocess.fun/api/moment/collect")
    console.log("[v0] Body:", JSON.stringify(requestBody, null, 2))
    console.log("[v0] Headers: Content-Type: application/json, x-api-key: [MASKED]")

    // Call the InProcess API to collect the moment
    const response = await fetch("https://inprocess.fun/api/moment/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] 📥 InProcess API response status:", response.status)
    console.log("[v0] 📥 InProcess API response ok:", response.ok)

    const responseText = await response.text()
    console.log("[v0] 📥 InProcess API response body:", responseText)

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }
      console.error("[v0] ❌ InProcess API error:", JSON.stringify(errorData, null, 2))
      return NextResponse.json(
        {
          error: "Failed to collect moment via InProcess API",
          details: errorData,
          status: response.status,
          statusText: response.statusText,
        },
        { status: response.status },
      )
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { message: responseText }
    }
    console.log("[v0] ✅ InProcess API success:", JSON.stringify(data, null, 2))
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] ❌ Error in collect API route:", error)
    console.error("[v0] ❌ Error stack:", error.stack)
    return NextResponse.json(
      { error: "Internal server error", details: error.message, stack: error.stack },
      { status: 500 },
    )
  }
}
