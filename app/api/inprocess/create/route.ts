import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contract, token, account } = body

    console.log("[v0] 🔍 Create API called with body:", JSON.stringify(body, null, 2))

    // Validate required fields
    if (!contract?.name || !contract?.uri) {
      console.log("[v0] ❌ Missing contract fields")
      return NextResponse.json({ error: "Missing required contract fields: name, uri" }, { status: 400 })
    }

    if (!token?.tokenMetadataURI) {
      console.log("[v0] ❌ Missing token metadata URI")
      return NextResponse.json({ error: "Missing required token field: tokenMetadataURI" }, { status: 400 })
    }

    if (!account) {
      console.log("[v0] ❌ Missing account address")
      return NextResponse.json({ error: "Missing required field: account (wallet address)" }, { status: 400 })
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

    const now = Math.floor(Date.now() / 1000)
    const farFuture = now + 365 * 24 * 60 * 60 * 10 // 10 years from now

    const payload = {
      contract: {
        name: contract.name,
        uri: contract.uri,
      },
      token: {
        tokenMetadataURI: token.tokenMetadataURI,
        createReferral: account, // Use the artist's address as referral instead of placeholder
        salesConfig: {
          type: "erc20Mint",
          pricePerToken: "1000000", // 1 USDC (6 decimals)
          saleStart: now,
          saleEnd: farFuture,
          currency: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
        },
        mintToCreatorCount: 1,
      },
      account: account,
    }

    console.log("[v0] 📤 Sending payload to InProcess:", JSON.stringify(payload, null, 2))

    const response = await fetch("https://inprocess.fun/api/moment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    console.log("[v0] 📥 InProcess response status:", response.status)

    const responseText = await response.text()
    console.log("[v0] 📥 InProcess response:", responseText)

    if (response.ok) {
      let data
      try {
        data = JSON.parse(responseText)
      } catch {
        data = { message: responseText }
      }
      console.log("[v0] ✅ Moment created successfully!")
      return NextResponse.json(data)
    }

    // Handle error response
    let errorData
    try {
      errorData = JSON.parse(responseText)
    } catch {
      errorData = { message: responseText }
    }

    console.error("[v0] ❌ InProcess API error:", JSON.stringify(errorData, null, 2))

    return NextResponse.json(
      {
        error: "Failed to create moment via InProcess API",
        details: errorData,
        status: response.status,
        statusText: response.statusText,
      },
      { status: response.status },
    )
  } catch (error: any) {
    console.error("[v0] ❌ Error in create API route:", error)
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
