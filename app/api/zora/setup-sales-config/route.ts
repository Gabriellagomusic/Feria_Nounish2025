import { type NextRequest, NextResponse } from "next/server"
import { encodeFunctionData, parseUnits } from "viem"

const ERC20_MINTER_ADDRESS = "0x777777E8850d8D6d98De2B5f64fae401F96eFF31"
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const ERC20_MINTER_ABI = [
  {
    inputs: [
      { name: "tokenId", type: "uint256" },
      {
        components: [
          { name: "saleStart", type: "uint64" },
          { name: "saleEnd", type: "uint64" },
          { name: "maxTokensPerAddress", type: "uint64" },
          { name: "pricePerToken", type: "uint96" },
          { name: "fundsRecipient", type: "address" },
          { name: "currency", type: "address" },
        ],
        name: "salesConfig",
        type: "tuple",
      },
    ],
    name: "setSale",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractAddress, tokenId, fundsRecipient } = body

    console.log("[v0] 🔧 Setup Sales Config API called")
    console.log("[v0] 📝 Contract:", contractAddress)
    console.log("[v0] 📝 Token ID:", tokenId)
    console.log("[v0] 📝 Funds Recipient:", fundsRecipient)

    if (!contractAddress || !tokenId || !fundsRecipient) {
      return NextResponse.json(
        { error: "Missing required fields: contractAddress, tokenId, fundsRecipient" },
        { status: 400 },
      )
    }

    // Sales config: 1 USDC per token
    const salesConfig = {
      saleStart: 0n,
      saleEnd: BigInt("0xffffffffffffffff"), // max uint64
      maxTokensPerAddress: 0n, // unlimited
      pricePerToken: parseUnits("1", 6), // 1 USDC (6 decimals)
      fundsRecipient: fundsRecipient as `0x${string}`,
      currency: USDC_ADDRESS as `0x${string}`,
    }

    console.log("[v0] 💰 Sales Config:")
    console.log("[v0]   - Price: 1 USDC per token")
    console.log("[v0]   - Currency: USDC (Base)")
    console.log("[v0]   - Funds Recipient:", fundsRecipient)
    console.log("[v0]   - Sale Start: Immediate (0)")
    console.log("[v0]   - Sale End: Never (max uint64)")
    console.log("[v0]   - Max Per Address: Unlimited (0)")

    // Encode the setSale function call
    const setSaleData = encodeFunctionData({
      abi: ERC20_MINTER_ABI,
      functionName: "setSale",
      args: [BigInt(tokenId), salesConfig],
    })

    console.log("[v0] ✅ Encoded setSale data:", setSaleData)

    return NextResponse.json({
      success: true,
      message: "Sales config transaction data prepared",
      setSaleData,
      salesConfig: {
        pricePerToken: "1 USDC",
        currency: "USDC on Base",
        fundsRecipient,
        saleStart: "Immediate",
        saleEnd: "Never",
        maxPerAddress: "Unlimited",
      },
    })
  } catch (error: any) {
    console.error("[v0] ❌ Error in setup-sales-config API:", error)
    return NextResponse.json(
      {
        error: "Failed to prepare sales config",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
