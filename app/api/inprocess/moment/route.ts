import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const contractAddress = searchParams.get("contractAddress")
    const tokenId = searchParams.get("tokenId")
    const chainId = searchParams.get("chainId") || "8453" // Default to Base chain

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "contractAddress and tokenId are required" }, { status: 400 })
    }

    console.log("[v0] Moment API - Fetching moment:", { contractAddress, tokenId, chainId })

    // 1 USD ≈ 0.0003 ETH (at ~$3,333 per ETH)
    // 0.0003 ETH = 300000000000000 wei (18 decimals)
    const defaultSalesConfig = {
      type: "fixedPrice",
      pricePerToken: "300000000000000", // 0.0003 ETH ≈ 1 USD
      saleStart: 0,
      saleEnd: "18446744073709551615", // maxUint64 - no end date
      // Note: No 'currency' field for fixedPrice - uses native ETH on Base
    }

    const momentData = {
      contractAddress,
      tokenId: Number.parseInt(tokenId),
      chainId: Number.parseInt(chainId),
      salesConfig: defaultSalesConfig,
    }

    console.log(
      "[v0] Moment API - Returning fixedPrice sales config (ETH on Base):",
      JSON.stringify(momentData, null, 2),
    )

    return NextResponse.json(momentData)
  } catch (error) {
    console.error("[v0] Moment API - Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
