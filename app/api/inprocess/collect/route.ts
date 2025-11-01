import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, tokenId, amount, comment, walletAddress } = body

    console.log("[v0] 🔍 Collect API called with body:", JSON.stringify(body, null, 2))
    console.log("[v0] 📥 Request headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2))

    if (!contractAddress || !tokenId || !amount || !walletAddress) {
      console.log("[v0] ❌ Missing required fields")
      return NextResponse.json(
        { error: "Missing required fields: contractAddress, tokenId, amount, walletAddress" },
        { status: 400 },
      )
    }

    const apiKey = process.env.INPROCESS_API_KEY

    if (!apiKey) {
      console.log("[v0] ❌ INPROCESS_API_KEY environment variable is not set")
      console.log(
        "[v0] 📋 Available env vars:",
        Object.keys(process.env).filter((k) => k.includes("INPROCESS")),
      )
      return NextResponse.json(
        { error: "INPROCESS_API_KEY environment variable is not configured. Please add it in the Vars section." },
        { status: 500 },
      )
    }

    const maskedKey = apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4)
    console.log("[v0] ✅ API key found:", maskedKey)
    console.log("[v0] 📝 API key length:", apiKey.length)
    console.log("[v0] 📝 API key starts with:", apiKey.substring(0, 3))
    console.log("[v0] 👛 Collector wallet address:", walletAddress)

    const requestBody = {
      moment: {
        contractAddress,
        tokenId: tokenId.toString(),
      },
      amount,
      collector: walletAddress, // The wallet that will pay for gas and receive the NFT
      comment: comment || "Collected via Feria Nounish!",
    }

    console.log("[v0] 📤 Sending request to InProcess API:")
    console.log("[v0] URL: https://inprocess.fun/api/moment/collect")
    console.log("[v0] Body:", JSON.stringify(requestBody, null, 2))
    console.log("[v0] Headers: Content-Type: application/json, x-api-key: [MASKED]")

    const startTime = Date.now()

    // Call the InProcess API to collect the moment
    const response = await fetch("https://inprocess.fun/api/moment/collect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    const endTime = Date.now()
    console.log("[v0] ⏱️ Request took:", endTime - startTime, "ms")

    console.log("[v0] 📥 InProcess API response status:", response.status)
    console.log("[v0] 📥 InProcess API response ok:", response.ok)
    console.log(
      "[v0] 📥 InProcess API response headers:",
      JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
    )

    const responseText = await response.text()
    console.log("[v0] 📥 InProcess API response body:", responseText)
    console.log("[v0] 📥 Response body length:", responseText.length, "characters")

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch {
        errorData = { message: responseText }
      }
      console.error("[v0] ❌ InProcess API error:", JSON.stringify(errorData, null, 2))
      console.error("[v0] ❌ Error type:", typeof errorData)
      console.error("[v0] ❌ Error keys:", Object.keys(errorData))

      return NextResponse.json(
        {
          error: "Failed to collect moment via InProcess API",
          details: errorData,
          status: response.status,
          statusText: response.statusText,
          requestInfo: {
            contractAddress,
            tokenId,
            amount,
            walletAddress,
            apiKeyPresent: !!apiKey,
            apiKeyLength: apiKey.length,
          },
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
    console.error("[v0] ❌ Error type:", error.constructor.name)
    console.error("[v0] ❌ Error name:", error.name)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
        errorType: error.constructor.name,
        errorName: error.name,
      },
      { status: 500 },
    )
  }
}
