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

    const defaultSalesConfig = {
      type: "erc20Mint",
      pricePerToken: "1000000", // 1 USDC (6 decimals)
      currency: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      saleStart: 0,
      saleEnd: "18446744073709551615", // maxUint64 - no end date
    }

    const momentData = {
      contractAddress,
      tokenId: Number.parseInt(tokenId),
      chainId: Number.parseInt(chainId),
      salesConfig: defaultSalesConfig,
    }

    console.log(
      "[v0] Moment API - Returning erc20Mint sales config (1 USDC on Base):",
      JSON.stringify(momentData, null, 2),
    )

    return NextResponse.json(momentData)
  } catch (error) {
    console.error("[v0] Moment API - Error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
