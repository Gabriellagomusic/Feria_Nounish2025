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

    const requestFormats = [
      {
        name: "Format 1: collector field",
        body: {
          moment: {
            contractAddress,
            tokenId: tokenId.toString(),
          },
          amount,
          collector: walletAddress,
          comment: comment || "Collected via Feria Nounish!",
        },
      },
      {
        name: "Format 2: collectorAddress field",
        body: {
          moment: {
            contractAddress,
            tokenId: tokenId.toString(),
          },
          amount,
          collectorAddress: walletAddress,
          comment: comment || "Collected via Feria Nounish!",
        },
      },
      {
        name: "Format 3: walletAddress field",
        body: {
          moment: {
            contractAddress,
            tokenId: tokenId.toString(),
          },
          amount,
          walletAddress: walletAddress,
          comment: comment || "Collected via Feria Nounish!",
        },
      },
      {
        name: "Format 4: address field",
        body: {
          moment: {
            contractAddress,
            tokenId: tokenId.toString(),
          },
          amount,
          address: walletAddress,
          comment: comment || "Collected via Feria Nounish!",
        },
      },
    ]

    let lastError: any = null
    let lastResponse: any = null

    // Try each format until one works
    for (const format of requestFormats) {
      console.log(`[v0] 🔄 Trying ${format.name}...`)
      console.log("[v0] 📤 Request body:", JSON.stringify(format.body, null, 2))

      const startTime = Date.now()

      const response = await fetch("https://inprocess.fun/api/moment/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(format.body),
      })

      const endTime = Date.now()
      console.log(`[v0] ⏱️ ${format.name} took:`, endTime - startTime, "ms")
      console.log(`[v0] 📥 ${format.name} response status:`, response.status)

      const responseText = await response.text()
      console.log(`[v0] 📥 ${format.name} response:`, responseText)

      if (response.ok) {
        // Success! Return the result
        let data
        try {
          data = JSON.parse(responseText)
        } catch {
          data = { message: responseText }
        }
        console.log(`[v0] ✅ ${format.name} succeeded!`)
        return NextResponse.json(data)
      }

      // Store the error for later
      try {
        lastError = JSON.parse(responseText)
      } catch {
        lastError = { message: responseText }
      }
      lastResponse = response
    }

    // All formats failed, return detailed error
    console.error("[v0] ❌ All request formats failed")
    console.error("[v0] ❌ Last error:", JSON.stringify(lastError, null, 2))

    return NextResponse.json(
      {
        error: "Failed to collect moment via InProcess API",
        details: lastError,
        status: lastResponse?.status || 500,
        statusText: lastResponse?.statusText || "Internal Server Error",
        requestInfo: {
          contractAddress,
          tokenId,
          amount,
          walletAddress,
          apiKeyPresent: !!apiKey,
          apiKeyLength: apiKey.length,
          attemptedFormats: requestFormats.map((f) => f.name),
        },
        possibleCauses: [
          "El balance de la cuenta del artista en InProcess es insuficiente (no el balance del coleccionista)",
          "El API key no tiene permisos para este contrato",
          "El contrato tiene restricciones específicas",
          "Se necesita un flujo diferente (firma del coleccionista, etc.)",
        ],
      },
      { status: lastResponse?.status || 500 },
    )
  } catch (error: any) {
    console.error("[v0] ❌ Error in collect API route:", error)
    console.error("[v0] ❌ Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
